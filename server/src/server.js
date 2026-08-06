// Entry point — loads env vars, validates config, verifies the database,
// starts background jobs, then starts the HTTP server. The server only starts
// listening AFTER the database has been verified, so a broken dependency is
// never masked by a silently listening process.
import "dotenv/config";
import "./config/env.js";
import { prisma } from "./config/prisma.js";
import { getPaystackKey } from "./config/paystack.js";
import { PORT } from "./config/env.js";

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
  console.log(`✅ Environment loaded (NODE_ENV=${process.env.NODE_ENV || "development"}, PORT=${PORT})`);

  const required = ["DATABASE_URL", "JWT_SECRET", "FRONTEND_URL", "CLIENT_ORIGINS"];
  for (const key of required) {
    const value = process.env[key];
    const shown = value ? (key === "JWT_SECRET" ? `${value.length} chars` : "set") : "MISSING";
    console.log(`   ${key}=${shown}`);
  }
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) console.log(`⚠️  Missing env vars: ${missing.join(", ")}`);
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.log("⚠️  JWT_SECRET is shorter than 32 chars — set a strong secret before production");
  }

  try {
    await prisma.$connect();
    console.log(`✅ Database connected (${dbLabel()})`);
    console.log("✅ Prisma Client initialized");
  } catch (err) {
    console.error(`❌ Database connection failed: ${err.message}`);
    console.error("Exiting...");
    process.exit(1);
  }

  // Start the Express app (and its background jobs) only AFTER the DB is verified
  const { default: app } = await import("./app.js");

  console.log("✅ Background jobs started");
  console.log("   - Renewal processor (every 12h)");
  console.log("   - Auto-publisher    (every 15min)");

  const paystackKey = await getPaystackKey();
  if (paystackKey) {
    console.log("✅ Paystack webhook ready (/api/payments/webhook) — live key configured");
  } else if (process.env.NODE_ENV === "production") {
    console.error("❌ Paystack secret key is not configured — payments will fail in production");
  } else {
    console.log("⚠️  Paystack: no key — dev-mode bypass active (payments auto-succeed). Disabled in production.");
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Startup failed:", err);
  process.exit(1);
});
