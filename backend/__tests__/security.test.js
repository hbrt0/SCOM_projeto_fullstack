// Testes de segurança básicos para o backend (registro, login, CSRF, rate limiting)

import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db.js';

// Encerra a pool de conexões ao final dos testes para evitar pendências
afterAll(async () => {
  await pool.end();
});

// Gera um username único para evitar colisões entre execuções de teste
function uniqueUsername(prefix = 'user') {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`;
}

// Helper que obtém um token CSRF usando o agente (mantém cookies entre requisições)
async function getCsrfToken(agent) {
  const res = await agent.get('/api/auth/csrf');
  return res.body.csrfToken;
}

describe('Testes de segurança básicos', () => {
  test('Rejeita mutação sem CSRF', async () => {
    // Envia uma requisição POST direta sem token CSRF — deve ser bloqueada (403)
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.statusCode).toBe(403);
  });

  test('Cadastro com entrada maliciosa é sanitizado/validado', async () => {
    // Usa um agente para preservar cookies, obtém CSRF e tenta registrar com dados inválidos/maliciosos
    const agent = request.agent(app);
    const csrf = await getCsrfToken(agent);
    const bad = await agent
      .post('/api/auth/register')
      .set('x-csrf-token', csrf)
      .send({
        username: "<script>alert(1)</script>", // payload XSS
        email: "not-an-email",                  // email inválido
        password: "123"                         // senha fraca
      });
    // Espera-se validação do servidor: status 400 e detalhes de erro
    expect(bad.statusCode).toBe(400);
    expect(bad.body.errors).toBeDefined();
  });

  test('Fluxo de registro -> login funciona', async () => {
    // Testa fluxo completo: register (com CSRF) seguido de login (com novo CSRF)
    const agent = request.agent(app);
    const username = uniqueUsername('flow');

    const csrf1 = await getCsrfToken(agent);
    const r = await agent.post('/api/auth/register')
      .set('x-csrf-token', csrf1)
      .send({
        username,
        email: `${username}@example.com`,
        password: 'senhaForte123'
      });
    // Pode retornar 200 ou 201 dependendo da implementação
    expect([200, 201]).toContain(r.statusCode);

    // Agora realiza login e verifica que o usuário retornado corresponde ao registrado
    const csrf2 = await getCsrfToken(agent);
    const l = await agent.post('/api/auth/login')
      .set('x-csrf-token', csrf2)
      .send({ username, password: 'senhaForte123' });
    expect(l.statusCode).toBe(200);
    expect(l.body.user.username).toBe(username);
  });

  test('Login rejeita tentativa de SQL injection', async () => {
    // Tenta logar usando payload típico de SQL injection; espera falha de autenticação (401)
    const agent = request.agent(app);
    const csrf = await getCsrfToken(agent);
    const res = await agent.post('/api/auth/login')
      .set('x-csrf-token', csrf)
      .send({
        username: "admin' OR '1'='1",
        password: 'irrelevante'
      });
    expect(res.statusCode).toBe(401);
    // Mensagem de erro deve indicar credenciais inválidas (ou equivalente)
    expect(res.body.error).toMatch(/inválidas/i);
  });

  test('Rate limit bloqueia múltiplas tentativas de login', async () => {
    // Verifica se o rate limiter do endpoint de login bloqueia muitas tentativas falhas
    const agent = request.agent(app);
    const username = uniqueUsername('limit');

    // Registra o usuário primeiro para ter uma conta válida
    const csrfRegister = await getCsrfToken(agent);
    const register = await agent.post('/api/auth/register')
      .set('x-csrf-token', csrfRegister)
      .send({
        username,
        email: `${username}@example.com`,
        password: 'senhaForte123'
      });
    expect([200, 201]).toContain(register.statusCode);

    // Realiza N+1 tentativas de login com senha errada para acionar o bloqueio
    const maxAttempts = 10;
    const attempts = [];
    for (let i = 0; i < maxAttempts + 1; i++) {
      const csrfAttempt = await getCsrfToken(agent);
      const attempt = await agent.post('/api/auth/login')
        .set('x-csrf-token', csrfAttempt)
        .send({ username, password: 'senhaErrada' });
      attempts.push({ status: attempt.statusCode, body: attempt.body });
    }

    // Os primeiros maxAttempts podem retornar 401 (credenciais inválidas)
    const allowedAttempts = attempts.slice(0, maxAttempts);
    // A última tentativa deve ser bloqueada pelo rate limiter com 429
    const blockedAttempt = attempts[attempts.length - 1];

    expect(allowedAttempts.some((res) => res.status === 401)).toBe(true);
    expect(blockedAttempt.status).toBe(429);
    expect(blockedAttempt.body.error).toMatch(/Muitas tentativas/i);
  });
});
