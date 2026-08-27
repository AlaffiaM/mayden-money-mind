import "dotenv/config";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const client = await pool.connect();
try {
  await client.query("BEGIN");

  const countQ = (table) =>
    `DELETE FROM "${table}" WHERE "userId" IN (SELECT id FROM "User" WHERE email LIKE '%@test.com')`;

  const deleted = {};

  for (const t of ["ListenLog", "NotificationRead", "Payment", "Subscription"]) {
    const r = await client.query(countQ(t));
    deleted[t] = r.rowCount;
  }

  const users = await client.query(
    `DELETE FROM "User" WHERE email LIKE '%@test.com'`
  );
  deleted.User = users.rowCount;

  await client.query("COMMIT");
  console.table(deleted);
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  client.release();
  await pool.end();
}
