// Centralized environment configuration — validates config and exposes typed accessors.
// Fails fast in production if secrets are weak/placeholder.

const PLACEHOLDER_PATTERNS = ["your-secret-key", "change-in-production", "changeme", "replace-me"];

export const NODE_ENV = process.env.NODE_ENV || "development";
export const PORT = process.env.PORT || 5000;
export const DATABASE_URL = process.env.DATABASE_URL;
export const JWT_SECRET = process.env.JWT_SECRET;
export const FRONTEND_URL = process.env.FRONTEND_URL || "https://mayden-money-mind.vercel.app";
export const CLIENT_ORIGINS = (process.env.CLIENT_ORIGINS || "https://mayden-money-mind.vercel.app")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export function assertSecureConfig() {
  if (NODE_ENV !== "production") return;

  const secret = JWT_SECRET;
  if (!secret || secret.length < 32 || PLACEHOLDER_PATTERNS.some((p) => secret.toLowerCase().includes(p))) {
    throw new Error("Insecure configuration: JWT_SECRET must be a strong, unique secret (>= 32 chars) in production.");
  }
}

assertSecureConfig();
