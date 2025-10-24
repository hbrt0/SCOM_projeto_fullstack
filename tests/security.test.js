import request from 'supertest';
import { app } from '../backend/src/app.js';
import { pool } from '../backend/src/db.js';

afterAll(async () => {
  await pool.end();
});

async function getCsrfToken(agent) {
  const res = await agent.get('/api/auth/csrf');
  return res.body.csrfToken;
}

describe('Testes de segurança básicos', () => {
  test('Rejeita mutação sem CSRF', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.statusCode).toBe(403);
  });

  test('Cadastro com entrada maliciosa é sanitizado/validado', async () => {
    const agent = request.agent(app);
    const csrf = await getCsrfToken(agent);
    const bad = await agent
      .post('/api/auth/register')
      .set('x-csrf-token', csrf)
      .send({
        username: "<script>alert(1)</script>",
        email: "not-an-email",
        password: "123"
      });
    expect(bad.statusCode).toBe(400);
    expect(bad.body.errors).toBeDefined();
  });

  test('Fluxo de registro -> login funciona', async () => {
    const agent = request.agent(app);
    const csrf1 = await getCsrfToken(agent);
    const r = await agent.post('/api/auth/register')
      .set('x-csrf-token', csrf1)
      .send({
        username: "userdemo",
        email: "userdemo@example.com",
        password: "senhaForte123"
      });
    expect([200,201]).toContain(r.statusCode);

    const csrf2 = await getCsrfToken(agent);
    const l = await agent.post('/api/auth/login')
      .set('x-csrf-token', csrf2)
      .send({ username: "userdemo", password: "senhaForte123" });
    expect(l.statusCode).toBe(200);
    expect(l.body.user.username).toBe("userdemo");
  });
});
