// Admin role check middleware — must be chained after authenticate middleware
// Re-loads the user from the DB on every request so a deleted, demoted, or
// role-changed admin is blocked immediately instead of trusting a stale JWT.
import { prisma } from "../config/prisma.js";
import logger from "../utils/logger.js";

export async function requireAdmin(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}
