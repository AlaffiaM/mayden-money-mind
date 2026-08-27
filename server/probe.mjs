import "dotenv/config";
import pg from "pg";

const { Client } = pg;

const baseUrl = process.env.DATABASE_URL;
const testUrl = new URL(baseUrl);
console.log("base HAS schema param:", baseUrl.includes("schema="));
testUrl.searchParams.set("schema", "test");
process.env.DATABASE_URL = testUrl.toString();
console.log("helpers-style DATABASE_URL:", process.env.DATABASE_URL);

const { prisma } = await import("./src/config/prisma.js");
const subs = await prisma.subscription.count();
const users = await prisma.user.count();
console.log("app prisma -> subscriptions:", subs, "users:", users);

// direct pg on test schema
if (!testUrl.searchParams.has("sslmode")) testUrl.searchParams.set("sslmode", "require");
const c = new Client({ connectionString: testUrl.toString() });
await c.connect();
const t = await c.query('select count(*)::int as n from "test"."Subscription"');
const u = await c.query('select count(*)::int as n from "test"."User"');
console.log("direct pg test schema -> subs:", t.rows[0].n, "users:", u.rows[0].n);
await c.end();
await prisma.$disconnect();
