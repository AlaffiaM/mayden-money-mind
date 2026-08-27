import "dotenv/config";
import pg from "pg";

const testUrl = new URL(process.env.DATABASE_URL);
testUrl.searchParams.set("schema", "test");
if (!testUrl.searchParams.has("sslmode")) testUrl.searchParams.set("sslmode", "require");
const url = testUrl.toString();

async function tryPoolOptions() {
  const pool = new pg.Pool({ connectionString: url, options: "-c search_path=test" });
  try {
    const r = await pool.query("select current_schema() as s");
    console.log("A) plain pg.Pool with options -> current_schema:", r.rows[0].s);
  } catch (e) {
    console.log("A) plain pg.Pool with options FAILED:", e.message.split("\n")[0]);
  } finally {
    await pool.end();
  }
}

async function tryPoolConnectSet() {
  const pool = new pg.Pool({ connectionString: url });
  pool.on("connect", (client) => {
    client.query('SET search_path TO "test"').catch((e) => console.log("set err", e.message));
  });
  await new Promise((r) => setTimeout(r, 500));
  try {
    const r = await pool.query("select current_schema() as s");
    console.log("B) pg.Pool connect-SET -> current_schema:", r.rows[0].s);
  } catch (e) {
    console.log("B) FAILED:", e.message.split("\n")[0]);
  } finally {
    await pool.end();
  }
}

await tryPoolOptions();
await new Promise((r) => setTimeout(r, 300));
await tryPoolConnectSet();
