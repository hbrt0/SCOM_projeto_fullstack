// backend/src/routes/comments.js
import { Router } from "express";
import crypto from "crypto";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET /api/comments?slug=...
router.get("/", async (req, res, next) => {
  try {
    const slug = String(req.query.slug || "").trim();
    if (!slug) return res.status(400).json({ error: "slug obrigatório" });

    const { rows } = await pool.query(
      `SELECT id, author, message, created_at
         FROM comments
        WHERE page_slug = $1
        ORDER BY created_at DESC
        LIMIT 100`,
      [slug]
    );

    res.json(rows);
  } catch (e) { next(e); }
});

// POST /api/comments  { slug, message }
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const s = String(req.body.slug || "").trim();
    const m = String(req.body.message || "").trim();
    if (!s) return res.status(400).json({ error: "slug obrigatório" });
    if (!m) return res.status(400).json({ error: "mensagem obrigatória" });

    const u = req.currentUser || req.session.user;
    const displayName = u?.name || u?.username || "Usuário";

    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress || "";
    const ip_hash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);

    const { rows } = await pool.query(
      `INSERT INTO comments (page_slug, author, message, ip_hash)
       VALUES ($1,$2,$3,$4)
       RETURNING id, author, message, created_at`,
      [s, displayName, m, ip_hash]
    );

    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

export default router;
