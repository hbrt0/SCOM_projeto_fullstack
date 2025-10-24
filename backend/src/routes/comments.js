// backend/src/routes/comments.js
import { Router } from "express";
import crypto from "crypto";
import { pool } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

/**
 * GET /api/comments?slug=...
 * Lista comentários de uma página.
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
    next(e);
  }
});

/**
 * POST /api/comments
 * Body: { slug, message }
 * Requer usuário logado (pega author do req.session.user.username).
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

    // Nome exibido = username do usuário logado
    const displayName = String(req.session?.user?.username || "").trim();
    if (!displayName) return res.status(401).json({ error: "auth required" });

    // Anti-spam leve: hash do IP
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
 * Exclusao restrita a administradores.
 */
router.delete("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ error: "id obrigatorio" });

    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidV4Regex.test(id)) {
      return res.status(400).json({ error: "id invalido" });
    }

    const { rowCount } = await pool.query(`DELETE FROM comments WHERE id = $1`, [id]);
    if (rowCount === 0) {
      return res.status(404).json({ error: "comentario nao encontrado" });
    }

    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

export default router;
