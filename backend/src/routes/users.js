import express from 'express';
import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import { query, pool } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { adminCreateUserValidator, adminUpdateUserValidator } from '../validators/userValidators.js';

const router = express.Router();

// Regex para validar UUIDs no formato padrão (utilizado em validações de rota)
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/users
 * - Apenas administradores (requireAdmin) podem listar usuários.
 * - Implementa paginação simples via query params ?page=&limit=.
 * - Usa consultas parametrizadas para evitar SQL injection.
 */
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    // Normaliza parâmetros de paginação com limites razoáveis
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '10', 10)));
    const offset = (page - 1) * limit;

    // Seleciona campos não sensíveis (não retorna hashes de senha)
    const { rows } = await query(
      'SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    const count = await query('SELECT COUNT(*)::int AS total FROM users');
    res.json({ data: rows, page, limit, total: count.rows[0].total });
  } catch (err) {
    // Encaminha erro para o middleware centralizado
    next(err);
  }
});

/**
 * POST /api/users
 * - Cria um usuário via painel admin (requireAdmin).
 * - Valida entrada com adminCreateUserValidator (express-validator).
 * - Executa várias operações em transação para garantir consistência (BEGIN/COMMIT/ROLLBACK).
 * - Usa bcrypt para gerar hash de senha (salt rounds = 12).
 * - Cria um perfil associado (profiles) usando INSERT ... ON CONFLICT DO NOTHING.
 */
router.post('/', requireAdmin, adminCreateUserValidator, async (req, res, next) => {
  // Consegue um client do pool para controlar transação explicitamente
  const client = await pool.connect();
  try {
    // Validação de entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    await client.query('BEGIN'); // inicia transação
    const { username, email, password, role = 'user' } = req.body;

    // Checa duplicidade de username/email com a mesma conexão/tx
    const exists = await client.query('SELECT 1 FROM users WHERE username=$1 OR email=$2', [username, email]);
    if (exists.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Usuário ou e-mail já existe' });
    }

    // Gera hash seguro de senha; valor de rounds = 12 (configurável)
    const hash = await bcrypt.hash(password, 12);

    // Insere usuário e retorna campos não sensíveis
    const createUser = await client.query(
      'INSERT INTO users (username, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id, username, email, role',
      [username, email, hash, role]
    );
    const user = createUser.rows[0];

    // Garante que exista um perfil para o usuário (cria se não houver)
    await client.query('INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.id]);

    await client.query('COMMIT'); // finaliza transação
    res.status(201).json({ message: 'Usuário criado', user });
  } catch (err) {
    // Em caso de erro tenta rollback e encaminha o erro
    await pool.query('ROLLBACK');
    next(err);
  } finally {
    // Sempre libera o client de volta ao pool
    client.release();
  }
});

/**
 * PUT /api/users/:id
 * - Atualiza dados de usuário (admin only).
 * - Valida entrada e o formato do ID (UUID).
 * - Não permite que um admin altere a própria role.
 * - Faz checagens de duplicidade condicionais para username/email.
 * - Monta UPDATE dinâmico apenas com os campos enviados.
 * - Hash da senha se for atualizada.
 * - Usa transação para garantir atomicidade.
 * - Atualiza dados relevantes na sessão do usuário caso ele tenha editado a si mesmo.
 */
router.put('/:id', requireAdmin, adminUpdateUserValidator, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    // Valida formato do id para evitar queries inválidas
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const { username, email, password, role } = req.body;
    await client.query('BEGIN');

    // Busca estado atual do usuário
    const currentQ = await client.query('SELECT id, username, email, role FROM users WHERE id=$1', [id]);
    if (currentQ.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    const current = currentQ.rows[0];

    // Proteção: admin não pode escalar/descer a própria role
    if (req.session.user?.id === id && typeof role !== 'undefined' && role !== current.role) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Admins não podem alterar a própria role.' });
    }

    // Verifica duplicidade condicionalmente (somente se houver alteração)
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

    // Monta UPDATE dinâmico: adiciona apenas campos que mudam
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
    // Permite mudar role apenas se não for o próprio admin que está sendo editado
    if (typeof role !== 'undefined' && !(req.session.user?.id === id)) {
      fields.push(`role=$${idx++}`);
      values.push(role);
    }
    if (password) {
      // Gera hash caso a senha seja fornecida
      const hash = await bcrypt.hash(password, 12);
      fields.push(`password_hash=$${idx++}`);
      values.push(hash);
    }

    // Se nada para atualizar, retorna erro
    if (fields.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Nada para atualizar' });
    }

    // Finaliza SQL com updated_at e cláusula WHERE
    values.push(id);
    updateSql += fields.join(', ') + `, updated_at=NOW() WHERE id=$${idx} RETURNING id, username, email, role`;
    const updatedQ = await client.query(updateSql, values);
    const updated = updatedQ.rows[0];

    // Se o admin editou a si mesmo e mudou username/email, sincroniza a sessão
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

/**
 * DELETE /api/users/:id
 * - Remove usuário (admin only).
 * - Protege contra remoção da própria conta pelo admin (opcional/defensivo).
 * - Retorna 404 se usuário não existir.
 */
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Evita que um admin remova a própria conta acidentalmente
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
