// testDb.js — schema provisioning + fast truncate for the dedicated "test" schema.
// Used by tests/helpers.js to isolate each test file against a clean DB without
// the slow, schema-dropping `prisma db push --force-reset` (which left the schema
// missing on interruption and made resets unreliable).
//
// Strategy (fixes the previous test-isolation bugs):
//  * Never drop the schema — only TRUNCATE all tables (RESTART IDENTITY CASCADE).
//    A truncated schema can never leave the DB in a broken "no schema" state.
//  * Provision once (create schema + tables) only if they don't exist yet.
//  * Truncate runs at the start of every test file → clean slate for Setting,
//    User, Episode, etc., so stale rows never leak between runs or between files.
import pg from "pg";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function resetTestSchema() {
  const testUrl = new URL(process.env.DATABASE_URL);
  testUrl.searchParams.set("schema", "test");
  if (!testUrl.searchParams.has("sslmode")) {
    const host = testUrl.hostname.toLowerCase();
    const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1";
    if (!isLocal) testUrl.searchParams.set("sslmode", "require");
  }
  const url = testUrl.toString();

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const schemaExists = await client.query(
      "select schema_name from information_schema.schemata where schema_name = 'test'"
    );
    if (schemaExists.rows.length === 0) {
      // Schema not present (fresh DB) — create it and let `db push` build the tables.
      await client.query('create schema "test"');
    }

    const tables = await client.query(
      'select tablename from pg_tables where schemaname = \'test\' and tablename <> \'_prisma_migrations\''
    );

    if (tables.rows.length === 0) {
      // Tables not built yet — provision them via a non-destructive `db push`.
      await client.end();
      execSync("npx prisma db push", {
        cwd: path.join(__dirname, ".."),
        stdio: "pipe",
        env: { ...process.env },
      });
      return "provisioned";
    }

    // Fast, schema-safe reset — clears every table including Setting.
    const names = tables.rows.map((r) => `"test"."${r.tablename}"`).join(", ");
    await client.query(`truncate table ${names} restart identity cascade`);
    return "truncated";
  } finally {
    await client.end();
  }
}
