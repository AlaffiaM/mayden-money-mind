// Shared PrismaClient instance — single connection pool for the whole app.
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const isProd = process.env.NODE_ENV === "production";

// Tune the connection via URL query params (pg-native) instead of a PoolConfig
// object — passing an object to the adapter can corrupt connection-string
// password parsing. Hosted Postgres (e.g. Render) limits connections, so cap
// the pool and add timeouts to stop "Server has closed the connection".
const baseUrl = new URL(process.env.DATABASE_URL);
const isRemote = !/localhost|127\.0\.0\.1|::1/i.test(baseUrl.hostname);
baseUrl.searchParams.set("connection_limit", isProd ? "10" : "5");
baseUrl.searchParams.set("connect_timeout", "8");
baseUrl.searchParams.set("pool_timeout", "10");
// Render's managed Postgres uses TLS with a certificate issued by Render's own
// internal CA (not a public root CA), so verify-full fails. Encrypt in transit
// (sslmode=require) and accept that internal CA (sslaccept=accept_invalid_certs).
if (isRemote) {
  baseUrl.searchParams.set("sslmode", "require");
  baseUrl.searchParams.set("sslaccept", "accept_invalid_certs");
}
const connectionString = baseUrl.toString();

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter, log: isProd ? ["error"] : [] });

// Runs a fn, retrying transient connection errors a few times with backoff.
// Keeps startup (and background-job initial runs) from crashing the server
// when the hosted Postgres temporarily drops a pooled connection.
export async function withRetry(fn, { retries = 3, delayMs = 1000 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const transient =
        err?.error?.code === "57P01" || // admin shutdown
        /connection.*closed|connection.*terminat|ECONNRESET|ETIMEDOUT/i.test(
          JSON.stringify(err?.message || "")
        );
      if (!transient || attempt === retries) break;
      await new Promise((r) => setTimeout(r, delayMs * attempt));
    }
  }
  throw lastErr;
}