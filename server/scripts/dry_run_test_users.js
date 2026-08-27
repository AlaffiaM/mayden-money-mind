import "dotenv/config";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

async function main() {
  const requested = await pool.query(
    `SELECT u.id, u.email,
       (SELECT COUNT(*) FROM "Subscription" WHERE "userId" = u.id) AS sub_count,
       (SELECT COUNT(*) FROM "Payment" WHERE "userId" = u.id) AS payment_count
     FROM "User" u WHERE email LIKE '%@test.com' ORDER BY id;`
  );
  console.log("=== Requested dry-run ===");
  console.table(requested.rows);

  const extra = await pool.query(
    `SELECT u.id, u.email,
       (SELECT COUNT(*) FROM "ListenLog" WHERE "userId" = u.id) AS listen_log_count,
       (SELECT COUNT(*) FROM "NotificationRead" WHERE "userId" = u.id) AS notif_read_count,
       (SELECT COUNT(*) FROM "Subscription" WHERE "userId" = u.id) AS sub_count,
       (SELECT COUNT(*) FROM "Payment" WHERE "userId" = u.id) AS payment_count
     FROM "User" u WHERE email LIKE '%@test.com' ORDER BY u.id;`
  );
  console.log("\n=== Full FK-dependents check (incl. ListenLog, NotificationRead) ===");
  console.table(extra.rows);

  const totals = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE email LIKE '%@test.com') AS user_count,
       (SELECT COUNT(*) FROM "Payment" p JOIN "User" u ON u.id = p."userId" WHERE u.email LIKE '%@test.com') AS payment_rows,
       (SELECT COUNT(*) FROM "Subscription" s JOIN "User" u ON u.id = s."userId" WHERE u.email LIKE '%@test.com') AS sub_rows,
       (SELECT COUNT(*) FROM "ListenLog" l JOIN "User" u ON u.id = l."userId" WHERE u.email LIKE '%@test.com') AS listenlog_rows,
       (SELECT COUNT(*) FROM "NotificationRead" n JOIN "User" u ON u.id = n."userId" WHERE u.email LIKE '%@test.com') AS notifread_rows
     FROM "User" u WHERE email LIKE '%@test.com';`
  );
  console.log("\n=== Totals ===");
  console.table(totals.rows);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
