// JWT authentication middleware — verifies Bearer token and attaches decoded user to req.user
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";

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
