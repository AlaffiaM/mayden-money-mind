// Admin role check middleware — must be chained after authenticate middleware
// Returns 403 if the authenticated user is not an admin
export function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}
