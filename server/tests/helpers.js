// Test bootstrap — configures env, resets the test schema, and imports the app.
// Import this (or the app) only AFTER setting env vars, because the route modules
// read process.env at import time.
//
// Tests run against a DEDICATED "test" schema on the PostgreSQL database from
// server/.env, so `prisma db push --force-reset` can never touch real data.
import "dotenv/config";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import request from "supertest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.NODE_ENV = "test";

const baseUrl = process.env.DATABASE_URL;
if (!baseUrl || baseUrl.startsWith("file:")) {
  throw new Error("Tests require a PostgreSQL DATABASE_URL (e.g. Render) in server/.env");
}
const testUrl = new URL(baseUrl);
testUrl.searchParams.set("schema", "test");
process.env.DATABASE_URL = testUrl.toString();

process.env.JWT_SECRET = "test-jwt-secret-0123456789abcdef-0123456789abcdef";
process.env.CLIENT_ORIGINS = "http://localhost:5173";
process.env.FRONTEND_URL = "http://localhost:5173";
// No Paystack key by default → dev-mode payment bypass applies (safe outside production)
delete process.env.PAYSTACK_SECRET_KEY;

// Reset the test schema (tables created fresh) — never touches the default schema.
execSync("npx prisma db push --force-reset --skip-generate", {
  cwd: path.join(__dirname, ".."),
  stdio: "pipe",
});

// Dynamic imports AFTER env is configured — the shared PrismaClient singleton
// (config/prisma.js) must be constructed against the test schema.
export const { prisma } = await import("../src/config/prisma.js");
export const { default: app } = await import("../src/app.js");

// Prisma Client re-reads .env on construction and re-populates the live
// PAYSTACK_SECRET_KEY — delete it again so the dev-mode payment bypass (no
// Paystack key → always succeeds) stays active for tests. Webhook tests set
// their own test key before each run.
delete process.env.PAYSTACK_SECRET_KEY;

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

// Creates a user directly in the DB and returns the full row
export async function createUser({ fullName = "Test User", email, phone, password = "Password123!", role = "user" } = {}) {
  return prisma.user.create({
    data: { fullName, email, phone, passwordHash: await hashPassword(password), role },
  });
}

export async function createSubscription({ userId, plan = "weekly", status = "pending", nextRenewalDays = 7, autoRenew = true, paystackSubscriptionCode = null }) {
  return prisma.subscription.create({
    data: {
      userId,
      plan,
      status,
      autoRenew,
      paystackSubscriptionCode,
      nextRenewal: new Date(Date.now() + nextRenewalDays * 86400000),
    },
  });
}

export async function createPayment({ userId, subscriptionId, amount = 100, status = "pending", reference, paidAt }) {
  return prisma.payment.create({
    data: {
      userId,
      subscriptionId,
      amount,
      status,
      reference: reference || `REF-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      paidAt: paidAt || null,
    },
  });
}

// Logs in via the API and returns the JWT token
export async function login(email, password) {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  return res.body.token;
}
