// Entry point — loads env vars, validates config, verifies the database,
// starts background jobs, then starts the HTTP server. The server only starts
// listening AFTER the database has been verified, so a broken dependency is
// never masked by a silently listening process.
import "dotenv/config";
import "./config/env.js";
import { prisma } from "./config/prisma.js";
import { getPaystackKey } from "./config/paystack.js";
import { PORT } from "./config/env.js";
import logger from "./utils/logger.js";

// Human-readable database label derived from DATABASE_URL
function dbLabel() {
  const url = process.env.DATABASE_URL || "file:./dev.db";
  if (url.startsWith("postgres")) {
    try {
      return `PostgreSQL (${new URL(url).host})`;
    } catch {
      return "PostgreSQL";
    }
  }
  if (url.startsWith("mysql")) return "MySQL";
  if (url.startsWith("file:")) return `SQLite (${url.slice(5).split("?")[0]})`;
  return "Prisma";
}

async function main() {
  logger.info(`✅ Environment loaded (NODE_ENV=${process.env.NODE_ENV || "development"}, PORT=${PORT})`);

  const required = ["DATABASE_URL", "JWT_SECRET", "FRONTEND_URL", "CLIENT_ORIGINS"];
  for (const key of required) {
    const value = process.env[key];
    const shown = value ? (key === "JWT_SECRET" ? `${value.length} chars` : "set") : "MISSING";
    logger.info(`   ${key}=${shown}`);
  }
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    logger.warn(`⚠️  Missing env vars: ${missing.join(", ")}`);
    // In production, missing vars are fatal
    if (process.env.NODE_ENV === 'production') {
      logger.error('❌ Fatal: Missing required environment variables');
      process.exit(1);
    }
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret) {
    if (jwtSecret.length < 32) {
      if (process.env.NODE_ENV === 'production') {
        logger.error('❌ Fatal: JWT_SECRET is shorter than 32 characters');
        process.exit(1);
      } else {
        logger.warn('⚠️  JWT_SECRET is shorter than 32 chars — set a strong secret before production');
      }
    }
  }

  try {
    await prisma.$connect();
    logger.info(`✅ Database connected (${dbLabel()})`);
    logger.info("✅ Prisma Client initialized");
  } catch (err) {
    logger.error(`❌ Database connection failed: ${err.message}`);
    logger.error("Exiting...");
    process.exit(1);
  }

  // Start the Express app (and its background jobs) only AFTER the DB is verified
  const { default: app } = await import("./app.js");

  logger.info("✅ Background jobs started");
  logger.info("   - Renewal processor (every 12h)");
  logger.info("   - Auto-publisher    (every 15min)");

  const paystackKey = await getPaystackKey();
  if (paystackKey) {
    logger.info("✅ Paystack webhook ready (/api/payments/webhook) — live key configured");
  } else if (process.env.NODE_ENV === "production") {
    logger.error("❌ Paystack secret key is not configured — payments will fail in production");
  } else {
    logger.warn("⚠️  Paystack: no key — dev-mode bypass active (payments auto-succeed). Disabled in production.");
  }

  app.listen(PORT, () => {
    logger.info(`🚀 Server running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  logger.error("Startup failed:", err.stack || err);
  process.exit(1);
});
