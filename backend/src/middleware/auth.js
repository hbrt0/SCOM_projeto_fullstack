// backend/src/middleware/auth.js
export function requireAuth(req, res, next) {
  const u = req.session?.user || req.user;
  if (!u) return res.status(401).json({ error: "auth required" });
  req.currentUser = u;
  next();
}

export function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Acesso negado: admin somente' });
}
