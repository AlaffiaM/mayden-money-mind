import "dotenv/config";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const r = await pool.query(
  `SELECT id, email FROM "User" WHERE email LIKE '%@test.com'`
);
console.log("test users returned:", r.rows.length);
console.table(r.rows);

const c = await pool.query(`SELECT COUNT(*) FROM "User"`);
console.log("total User count:", c.rows[0].count);

await pool.end();
