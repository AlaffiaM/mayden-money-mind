




import "dotenv/config";
import "./config/env.js";
import { prisma } from "./config/prisma.js";
import { getPaystackKey } from "./config/paystack.js";
import { PORT } from "./config/env.js";
import logger from "./utils/logger.js";
import { execSync } from 'child_process';
import util from 'util';


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

    
    logger.info("🔄 Running database migrations...");
    try {
      execSync("npx prisma migrate deploy", { stdio: 'inherit' });
      logger.info("✅ Migrations completed successfully");
    } catch (migrateErr) {
      logger.error(`❌ Migration failed: ${migrateErr.message}`);
      logger.error("Continuing anyway in case migration was already applied...");
      
      
    }
  } catch (err) {
    logger.error(`❌ Database connection failed: ${err.message}`);
    logger.error("Exiting...");
    process.exit(1);
  }

  
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
  logger.error(`Startup failed: err=${err}`);
  logger.error(`typeof err: ${typeof err}`);
  if (err instanceof Error) {
    logger.error(`Startup failed: ${err.message}`);
    logger.error(`Stack: ${err.stack}`);
  } else {
    logger.error(`Startup failed: ${util.inspect(err, { depth: null })}`);
  }
  process.exit(1);
});
