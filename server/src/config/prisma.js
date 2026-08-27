// Shared PrismaClient instance — single connection pool for the whole app.
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Hosted (Render, etc.) Postgres requires SSL; a local instance usually does not.
// Only force sslmode=require for non-local hosts so local dev keeps working
// against a plain (non-SSL) local Postgres. An explicit sslmode in the URL wins.
let connectionString = process.env.DATABASE_URL;
const parsed = new URL(connectionString);
const schema = parsed.searchParams.get("schema");
if (!parsed.searchParams.has("sslmode")) {
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname.toLowerCase());
  if (!isLocal) parsed.searchParams.set("sslmode", "require");
  connectionString = parsed.toString();
}

// The Prisma 7 pg driver adapter qualifies *generated* queries with the `schema`
// option, but it does NOT apply the schema to the connection's search_path — so
// raw SQL ($executeRaw/$queryRaw) would hit the default schema instead, which in
// Prisma 6 the `?schema=` param used to handle automatically. That broke test
// isolation (raw deletes in tests ran against the production schema).
//
// Fix: pass an external `pg.Pool` whose `-c search_path=...` startup parameter
// forces BOTH generated and raw queries onto the selected schema. We own the pool
// (disposeExternalPool: false) so Prisma doesn't close it behind us.
const poolConfig = { connectionString };
if (schema) poolConfig.options = `-c search_path=${JSON.stringify(schema)}`;
const pool = new pg.Pool(poolConfig);

const adapter = new PrismaPg(
  pool,
  ...(schema ? [{ schema, disposeExternalPool: false }] : [{ disposeExternalPool: false }])
);
export const prisma = new PrismaClient({ adapter });
