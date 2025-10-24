import express from 'express';
import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import { query } from '../db.js';
import { registerValidator, loginValidator } from '../validators/authValidators.js';
import { loginLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

// Entrega token CSRF
router.get('/csrf', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Quem sou eu
router.get('/me', async (req, res, next) => {
  try {
    const u = req.session?.user;
    if (!u) return res.sendStatus(204);
    const { rows } = await query(
      'SELECT id, username, email, role FROM users WHERE id=$1',
      [u.id]
    );
    const fresh = rows[0];
    if (!fresh) return res.sendStatus(204);
    // opcional: sincroniza sessão em memória também
    req.session.user.role = fresh.role;
    res.json(fresh);
  } catch (e) { next(e); }
});

// backend/src/routes/auth.js (trecho handler de registro)
router.post('/register', registerValidator, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, email, password } = req.body;

    // checar duplicidade
    const dup = await query('SELECT 1 FROM users WHERE username=$1 OR email=$2', [username, email]);
    if (dup.rowCount > 0) return res.status(409).json({ error: 'Usuário ou e-mail já cadastrados' });

    const hash = await bcrypt.hash(password, 10);

    const { rows } = await query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, role, created_at`,
      [username, email, hash]
    );

    // cria sessão
    req.session.user = rows[0];
    res.status(201).json({ message: 'Conta criada', user: rows[0] });
  } catch (err) {
    next(err);
  }
});


// Login
router.post('/login', loginLimiter, loginValidator, async (req, res, next) => {
  try {
     const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { username, password } = req.body;

    const { rows } = await query(
      'SELECT id, username, email, role, password_hash FROM users WHERE username=$1',
      [username]
    );

    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });

    delete user.password_hash;
    await new Promise((resolve, reject) =>
      req.session.regenerate(err => err ? reject(err) : resolve())
    );
    req.session.user = user;
    await new Promise((resolve, reject) =>
      req.session.save(err => err ? reject(err) : resolve())
    );
    res.json({ message: 'Login efetuado', user });
  } catch (err) { next(err); }
});

// Logout
router.post('/logout', (req, res, next) => {
  req.session.destroy(err => {
    if (err) return next(err);
    res.clearCookie('sid');
    res.json({ message: 'Logout efetuado' });
  });
});

export default router;
