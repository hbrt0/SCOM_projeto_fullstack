import express from 'express';                      // framework web
import bcrypt from 'bcryptjs';                      // hashing de senhas
import { validationResult } from 'express-validator'; // validação de requisições
import { query } from '../db.js';                   // helper para executar queries no Postgres
import { registerValidator, loginValidator } from '../validators/authValidators.js'; // regras de validação
import { loginLimiter } from '../middleware/rateLimit.js'; // rate limiter específico para login

const router = express.Router(); // roteador para rotas de autenticação

// Entrega token CSRF ao cliente (usa csurf middleware configurado em app.js)
// Rota GET retorna um token que o cliente deve enviar em requisições mutadoras (POST/PUT/DELETE)
router.get('/csrf', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// "Quem sou eu" - retorna informações do usuário autenticado com base na sessão
// Se não houver usuário na sessão, responde 204 No Content
router.get('/me', async (req, res, next) => {
  try {
    const u = req.session?.user;
    if (!u) return res.sendStatus(204);

    // Recarrega dados frescos do banco (evita confiar somente em dados da sessão)
    const { rows } = await query(
      'SELECT id, username, email, role FROM users WHERE id=$1',
      [u.id]
    );
    const fresh = rows[0];
    if (!fresh) return res.sendStatus(204);

    // Sincroniza informação relevante na sessão (ex.: role) e retorna o usuário
    req.session.user.role = fresh.role;
    res.json(fresh);
  } catch (e) { next(e); }
});


// Registro de usuário
// - Aplica validações definidas em registerValidator
// - Verifica erros de validação e duplicidade (username/email)
// - Hash da senha com bcrypt e inserção segura usando parâmetros ($1, $2, ...)
// - Cria sessão para o usuário recém-criado
router.post('/register', registerValidator, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, email, password } = req.body;

    // Checa duplicidade por username ou email
    const dup = await query('SELECT 1 FROM users WHERE username=$1 OR email=$2', [username, email]);
    if (dup.rowCount > 0) return res.status(409).json({ error: 'Usuário ou e-mail já cadastrados' });

    // Gera hash seguro da senha (salt rounds = 10)
    const hash = await bcrypt.hash(password, 10);

    // Insere usuário e retorna campos úteis (sem o hash)
    const { rows } = await query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, role, created_at`,
      [username, email, hash]
    );

    // Armazena dados do usuário na sessão e responde 201
    req.session.user = rows[0];
    res.status(201).json({ message: 'Conta criada', user: rows[0] });
  } catch (err) {
    next(err);
  }
});


// Login
// - Aplica rate limiter (loginLimiter) para evitar brute-force
// - Valida entrada com loginValidator
// - Busca usuário por username, compara a senha fornecida com o hash armazenado
// - Regenera e salva a sessão (mitiga fixation) e retorna dados do usuário
router.post('/login', loginLimiter, loginValidator, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, password } = req.body;

    // Busca usuário no banco (inclui password_hash para verificação)
    const { rows } = await query(
      'SELECT id, username, email, role, password_hash FROM users WHERE username=$1',
      [username]
    );

    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

    // Compara senha com bcrypt
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });

    // Remove o hash antes de expor o usuário
    delete user.password_hash;

    // Regenera a sessão para mitigar session fixation e atribui o usuário
    await new Promise((resolve, reject) =>
      req.session.regenerate(err => err ? reject(err) : resolve())
    );
    req.session.user = user;

    // Garante que a sessão foi persistida no store (Postgres)
    await new Promise((resolve, reject) =>
      req.session.save(err => err ? reject(err) : resolve())
    );

    res.json({ message: 'Login efetuado', user });
  } catch (err) { next(err); }
});


// Logout: destrói a sessão no store e limpa o cookie no cliente
router.post('/logout', (req, res, next) => {
  req.session.destroy(err => {
    if (err) return next(err);
    res.clearCookie('sid'); // nome do cookie definido em app.js
    res.json({ message: 'Logout efetuado' });
  });
});

export default router;
