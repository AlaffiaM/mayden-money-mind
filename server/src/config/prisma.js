import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const isProd = process.env.NODE_ENV === "production";

const baseUrl = new URL(process.env.DATABASE_URL);
const isRemote = !/localhost|127\.0\.0\.1|::1/i.test(baseUrl.hostname);
baseUrl.searchParams.set("connection_limit", isProd ? "10" : "5");
baseUrl.searchParams.set("connect_timeout", "8");
baseUrl.searchParams.set("pool_timeout", "10");

if (isRemote) {
  baseUrl.searchParams.set("sslmode", "no-verify");
}
const connectionString = baseUrl.toString();

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter, log: isProd ? ["error"] : [] });
