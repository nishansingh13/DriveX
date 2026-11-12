// server/src/middleware/requireAdmin.js
// Use after requireAuth: lets the request through only for admins.
module.exports = function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admins only" });
  }
  next();
};
