import "dotenv/config";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const r = await pool.query(
  `SELECT
     (SELECT COUNT(*) FROM "User" WHERE email LIKE '%@test.com') AS test_users,
     (SELECT COUNT(*) FROM "User") AS total_users`
);
console.table(r.rows);
await pool.end();
