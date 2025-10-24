import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db.js';

const router = express.Router();

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.session.user;
    const { rows } = await query(
      `SELECT u.id, u.username, u.email, u.role, p.full_name, p.bio
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.id=$1`,
      [id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/me', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.session.user;
    const { full_name, bio } = req.body;
    const { rows } = await query(
      `INSERT INTO profiles (user_id, full_name, bio, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id) DO UPDATE SET full_name = $2, bio = $3, updated_at = NOW()
       RETURNING user_id, full_name, bio`,
      [id, (full_name || '').trim(), (bio || '').trim()]
    );
    res.json({ message: 'Perfil atualizado', profile: rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
