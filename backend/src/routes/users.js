import express from 'express';
import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import { query, pool } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { adminCreateUserValidator, adminUpdateUserValidator } from '../validators/userValidators.js';

const router = express.Router();
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Listar usuários (paginação)
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '10', 10)));
    const offset = (page - 1) * limit;

    const { rows } = await query('SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    const count = await query('SELECT COUNT(*)::int AS total FROM users');
    res.json({ data: rows, page, limit, total: count.rows[0].total });
  } catch (err) {
    next(err);
  }
});

// Criar usuário (admin)
router.post('/', requireAdmin, adminCreateUserValidator, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    await client.query('BEGIN');
    const { username, email, password, role = 'user' } = req.body;

    const exists = await client.query('SELECT 1 FROM users WHERE username=$1 OR email=$2', [username, email]);
    if (exists.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Usuário ou e-mail já existe' });
    }

    const hash = await bcrypt.hash(password, 12);
    const createUser = await client.query(
      'INSERT INTO users (username, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id, username, email, role',
      [username, email, hash, role]
    );
    const user = createUser.rows[0];
    await client.query('INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.id]);
    await client.query('COMMIT');
    res.status(201).json({ message: 'Usuário criado', user });
  } catch (err) {
    await pool.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// Atualizar usuário (admin)
router.put('/:id', requireAdmin, adminUpdateUserValidator, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const { username, email, password, role } = req.body;
    await client.query('BEGIN');

    // busca atual
    const currentQ = await client.query('SELECT id, username, email, role FROM users WHERE id=$1', [id]);
    if (currentQ.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    const current = currentQ.rows[0];

    // não permitir alterar a própria role
    if (req.session.user?.id === id && typeof role !== 'undefined' && role !== current.role) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Admins não podem alterar a própria role.' });
    }

    // checa duplicidade de username/email se forem mudar
    if (username && username !== current.username) {
      const existsU = await client.query('SELECT 1 FROM users WHERE username=$1 AND id<>$2', [username, id]);
      if (existsU.rowCount > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Username já está em uso' });
      }
    }
    if (email && email !== current.email) {
      const existsE = await client.query('SELECT 1 FROM users WHERE email=$1 AND id<>$2', [email, id]);
      if (existsE.rowCount > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'E-mail já está em uso' });
      }
    }

    // monta UPDATE dinâmico
    let updateSql = 'UPDATE users SET ';
    const fields = [];
    const values = [];
    let idx = 1;

    if (username && username !== current.username) {
      fields.push(`username=$${idx++}`);
      values.push(username);
    }
    if (email && email !== current.email) {
      fields.push(`email=$${idx++}`);
      values.push(email);
    }
    if (typeof role !== 'undefined' && !(req.session.user?.id === id)) {
      fields.push(`role=$${idx++}`);
      values.push(role);
    }
    if (password) {
      const hash = await bcrypt.hash(password, 12);
      fields.push(`password_hash=$${idx++}`);
      values.push(hash);
    }

    if (fields.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Nada para atualizar' });
    }

    values.push(id);
    updateSql += fields.join(', ') + `, updated_at=NOW() WHERE id=$${idx} RETURNING id, username, email, role`;
    const updatedQ = await client.query(updateSql, values);
    const updated = updatedQ.rows[0];

    // se editou a si mesmo e mudou username/email, reflete na sessão
    if (req.session.user?.id === id) {
      if (username) req.session.user.username = updated.username;
      if (email)    req.session.user.email = updated.email;
    }

    await client.query('COMMIT');
    return res.json({ message: 'Usuário atualizado', user: updated });
  } catch (err) {
    await pool.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// Remover usuário (admin)
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    // ⛔️ Bloqueia admin de excluir a própria conta (opcional mas recomendado)
    if (req.session.user?.id === id) {
      return res.status(403).json({ error: 'Admins não podem excluir a própria conta.' });
    }

    const del = await query('DELETE FROM users WHERE id=$1', [id]);
    if (del.rowCount === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json({ message: 'Usuário removido' });
  } catch (err) {
    next(err);
  }
});

export default router;
