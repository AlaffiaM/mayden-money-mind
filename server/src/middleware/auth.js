// JWT authentication middleware — verifies Bearer token and attaches decoded user to req.user
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";
import { prisma } from "../config/prisma.js";

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, role }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Optional auth — attaches req.user if a valid Bearer token is present,
// but never rejects. Used for endpoints that are public but can return
// richer/access-controlled data to signed-in subscribers.
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    try {
      req.user = jwt.verify(header.split(" ")[1], JWT_SECRET);
    } catch {
      // ignore invalid token — treat as anonymous
    }
  }
  next();
}

// Requires the request to be from a verified, non-admin account. Run AFTER
// authenticate(). Admins always bypass — they are created by seed, not self-serve.
export async function requireVerified(req, res, next) {
  try {
    if (req.user?.role === "admin") return next();
    if (!req.user?.id) return res.status(401).json({ error: "No token provided" });

    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { emailVerified: true, role: true },
    });
    // Treat a missing row / never-verified account as unverified.
    if (!dbUser || dbUser.role !== "admin" && !dbUser.emailVerified) {
      return res.status(403).json({ error: "Please verify your email to continue." });
    }
    return next();
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
}
