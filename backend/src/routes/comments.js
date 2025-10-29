// backend/src/routes/comments.js
// Roteador do Express para endpoints de comentários
import { Router } from "express";
// Usado para criar um hash leve do IP (anti-spam sem armazenar IP em claro)
import crypto from "crypto";
// Pool de conexões com Postgres (helper direto do db.js)
import { pool } from "../db.js";
// Middlewares que garantem autenticação e privilégios de admin
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

/**
 * GET /api/comments?slug=...
 * Lista comentários de uma página identificada por `slug`.
 * - Valida presença de slug (retorna 400 se ausente).
 * - Consulta parametrizada para evitar SQL injection.
 * - Ordena por created_at desc e limita resultados (proteção contra respostas muito grandes).
 */
router.get("/", async (req, res, next) => {
  try {
    const slug = String(req.query.slug || "").trim();
    if (!slug) return res.status(400).json({ error: "slug obrigatório" });

    const { rows } = await pool.query(
      `SELECT id, author, message, created_at
         FROM comments
        WHERE page_slug = $1
        ORDER BY created_at DESC
        LIMIT 200`,
      [slug]
    );

    res.json(rows);
  } catch (e) {
    // Encaminha erro para middleware de erro centralizado
    next(e);
  }
});

/**
 * POST /api/comments
 * Body: { slug, message }
 * - Requer autenticação (requireAuth) e usa username da sessão como author.
 * - Valida slug e message (tamanho e presença).
 * - Gera ip_hash (sha256 slice) para anti-spam leve sem armazenar IP em texto claro.
 * - Insere comentário com query parametrizada e retorna o recurso criado (201).
 */
router.post("/", requireAuth, async (req, res, next) => {
  try {
    let { slug, message } = req.body || {};
    const s = String(slug || "").trim();
    const m = String(message || "").trim();

    if (!s) return res.status(400).json({ error: "slug obrigatório" });
    if (!m || m.length < 1 || m.length > 2000) {
      return res.status(400).json({ error: "mensagem inválida (1–2000 chars)" });
    }

    // Exibe o nome do autor a partir da sessão (não confie no body.author)
    const displayName = String(req.session?.user?.username || "").trim();
    if (!displayName) return res.status(401).json({ error: "auth required" });

    // Obtem IP real (x-forwarded-for quando atrás de proxy) e cria hash parcial
    const ip = (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "0.0.0.0").toString();
    const ip_hash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);

    const { rows } = await pool.query(
      `INSERT INTO comments (page_slug, author, message, ip_hash)
       VALUES ($1,$2,$3,$4)
       RETURNING id, author, message, created_at`,
      [s, displayName, m, ip_hash]
    );

    res.status(201).json(rows[0]);
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /api/comments/:id
 * - Exclusão restrita a administradores (requireAuth + requireAdmin).
 * - Valida parâmetro id (presença e formato UUID v4) antes de executar DELETE parametrizado.
 * - Retorna 204 se excluído com sucesso ou 404 se não encontrado.
 */
router.delete("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ error: "id obrigatório" });

    // Regex rígida para UUID v4 — evita operações com ids inválidos/inject
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidV4Regex.test(id)) {
      return res.status(400).json({ error: "id inválido" });
    }

    const { rowCount } = await pool.query(`DELETE FROM comments WHERE id = $1`, [id]);
    if (rowCount === 0) {
      return res.status(404).json({ error: "comentário não encontrado" });
    }

    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

export default router;
