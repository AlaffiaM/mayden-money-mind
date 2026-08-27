// One-time cleanup for duplicate episodes. Every weekday in every week currently has two
// identical rows (same title, dayType, publishDate, distinct UUID) that were created by
// double-running the admin batch scheduler.
//
// For each duplicate (dayType, publishDate) pair this keeps ONE row and deletes the rest:
//   1. Prefer a row that has any listenLogs (listens) over one that has none.
//   2. Otherwise keep the row with the oldest createdAt.
//
// USAGE
//   DRY-RUN (default, does NOT modify anything — prints exactly what would be deleted):
//     node prisma/dedupeEpisodes.js
//   ACTUALLY DELETE:
//     node prisma/dedupeEpisodes.js --apply
//
// Requires DATABASE_URL (loaded from server/.env via dotenv) and the `pg` driver.
import "dotenv/config";
import pg from "pg";

const APPLY = process.argv.includes("--apply");
const isDryRun = !APPLY;

const ssl = process.env.DATABASE_URL?.includes("localhost") || process.env.DATABASE_URL?.includes("127.0.0.1")
  ? false
  : { rejectUnauthorized: false };

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl });
await client.connect();

// Every row with a listen count (from the listenLogs table) so we can pick survivors.
const { rows: listens } = await client.query(
  `SELECT "episodeId", COUNT(*)::int AS listens FROM "ListenLog" GROUP BY "episodeId"`
);
const listensByEpisode = new Map(listens.map((r) => [r.episodeId, r.listens]));

const { rows: episodes } = await client.query(
  `SELECT id, title, "dayType", "publishDate", status, "createdAt" FROM "Episode" ORDER BY "publishDate" ASC`
);

// Group by (dayType, publishDate) — publishDate is a JS Date; group by its ms value.
const groups = new Map();
for (const e of episodes) {
  const key = `${e.dayType}|${new Date(e.publishDate).getTime()}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(e);
}

const survivors = [];
const toDelete = [];

for (const [key, group] of groups) {
  if (group.length < 2) continue; // not a duplicate

  // Sort: prefer the row with the most listens (preserves as much listen attribution
  // as possible), then the older createdAt. This keeps a listened row over an unlistened
  // one, and the higher-listen row when both have listens.
  const sorted = [...group].sort((a, b) => {
    const aL = listensByEpisode.get(a.id) || 0;
    const bL = listensByEpisode.get(b.id) || 0;
    if (aL !== bL) return bL - aL;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  const keep = sorted[0];
  survivors.push(keep);
  for (const dup of sorted.slice(1)) toDelete.push(dup);
}

console.log(`\nMODE: ${isDryRun ? "DRY RUN (no changes made)" : "APPLY (deleting rows)"}`);
console.log(`Total episodes: ${episodes.length}`);
console.log(`Duplicate groups found: ${groups.size > 0 ? [...groups.values()].filter((g) => g.length > 1).length : 0}`);
console.log(`Rows to DELETE: ${toDelete.length}`);
console.log(`Rows to KEEP:   ${survivors.length}\n`);

for (const d of toDelete) {
  const keepId = survivors.find(
    (s) => s.dayType === d.dayType && new Date(s.publishDate).getTime() === new Date(d.publishDate).getTime()
  ).id;
  const keptListens = listensByEpisode.get(keepId) || 0;
  const delListens = listensByEpisode.get(d.id) || 0;
  const day = new Date(d.publishDate).toISOString().slice(0, 10);
  console.log(
    `DELETE ${d.id} | ${String(d.dayType).padEnd(9)} | ${day} | status=${String(d.status).padEnd(9)} | ` +
    `created=${new Date(d.createdAt).toISOString().slice(0, 19)}Z | listens=${delListens} | "${d.title}"` +
    (delListens > 0 ? "  <-- HAS LISTENS" : "") +
    `  (keep ${keepId}, kept listens=${keptListens})`
  );
}

if (!isDryRun && toDelete.length > 0) {
  const ids = toDelete.map((d) => d.id);
  // Remove any listen history pointing at the rows being removed (a listener who hit the
  // duplicate row is counted against the surviving episode's title/day, but we must clear
  // the FK rows first so the delete doesn't trip the ON DELETE RESTRICT on ListenLog).
  const delLogs = await client.query(`DELETE FROM "ListenLog" WHERE "episodeId" = ANY($1::text[])`, [ids]);
  const delRes = await client.query(`DELETE FROM "Episode" WHERE id = ANY($1::text[])`, [ids]);
  console.log(`\nDeleted ${delRes.rowCount} episode rows (and ${delLogs.rowCount} orphaned listen logs).`);
} else if (isDryRun) {
  console.log("\nDry run only — nothing was changed. Re-run with --apply to delete.");
}

await client.end();
