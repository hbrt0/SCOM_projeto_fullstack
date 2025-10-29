import express from 'express';               // framework web minimal (router)
import { requireAuth } from '../middleware/auth.js'; // middleware que garante usuário autenticado
import { query } from '../db.js';            // helper centralizado para executar queries ao Postgres

const router = express.Router();             // roteador para agrupar endpoints relacionados ao perfil

// GET /api/profile/me
// - Rota protegida: requireAuth garante que exista uma sessão com usuário autenticado
// - Recupera o ID do usuário da sessão (req.session.user) e busca dados do usuário + profile
// - LEFT JOIN permite retornar dados do usuário mesmo quando não há profile ainda
// - Retorna um único objeto com informações básicas do usuário e campos do profile (full_name, bio)
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    // obtém id do usuário armazenado na sessão (definido no login)
    const { id } = req.session.user;

    // consulta parametrizada para evitar SQL injection e selecionar apenas campos não sensíveis
    const { rows } = await query(
      `SELECT u.id, u.username, u.email, u.role, p.full_name, p.bio
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.id=$1`,
      [id]
    );

    // envia o primeiro (e único) registro encontrado como JSON
    res.json(rows[0]);
  } catch (err) {
    // encaminha erro para o middleware centralizado de erro (logging / resposta consistente)
    next(err);
  }
});

// PUT /api/profile/me
// - Rota protegida: apenas usuários autenticados podem atualizar o próprio profile
// - Recebe full_name e bio no corpo da requisição e grava no banco
// - Usa INSERT ... ON CONFLICT DO UPDATE para criar ou atualizar o registro de profile em uma operação atômica
// - Trim nos campos evita espaços desnecessários; usa NOW() para updated_at
router.put('/me', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.session.user;                // id do usuário autenticado
    const { full_name, bio } = req.body;

    // Inserção com upsert: se já existir profile para o user_id, atualiza os campos
    const { rows } = await query(
      `INSERT INTO profiles (user_id, full_name, bio, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id) DO UPDATE SET full_name = $2, bio = $3, updated_at = NOW()
       RETURNING user_id, full_name, bio`,
      [id, (full_name || '').trim(), (bio || '').trim()]
    );

    // Retorna mensagem de sucesso e o profile atualizado
    res.json({ message: 'Perfil atualizado', profile: rows[0] });
  } catch (err) {
    // Em caso de erro, passa para o errorHandler centralizado
    next(err);
  }
});

export default router; // exporta o roteador para ser montado em app.js (/api/profile)
