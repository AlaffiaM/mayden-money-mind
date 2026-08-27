// One-time cleanup for duplicate episodes. Every weekday in every week currently has two
// identical rows (same title, dayType, publishDate, distinct UUID) that were created by
// double-running the admin batch scheduler.
//
// For each duplicate (dayType, publishDate) pair this keeps ONE row and deletes the rest:
//   1. Prefer the row with the most listenLogs (listens).
//   2. If listens are tied, prefer status=published over status=scheduled.
//   3. Only if status is also tied, keep the row with the NEWEST createdAt.
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

  // Sort: prefer the most listens; on a listen tie prefer published over scheduled;
  // only if status is also tied, keep the NEWER createdAt.
  const sorted = [...group].sort((a, b) => {
    const aL = listensByEpisode.get(a.id) || 0;
    const bL = listensByEpisode.get(b.id) || 0;
    if (aL !== bL) return bL - aL;
    const aPub = a.status === "published" ? 1 : 0;
    const bPub = b.status === "published" ? 1 : 0;
    if (aPub !== bPub) return bPub - aPub; // published preferred over scheduled
    return new Date(b.createdAt) - new Date(a.createdAt); // newer createdAt kept as final tiebreak
  });

  const keep = sorted[0];
  survivors.push(keep);
  for (const dup of sorted.slice(1)) toDelete.push(dup);
}

console.log(`\nMODE: ${isDryRun ? "DRY RUN (no changes made)" : "APPLY (deleting rows)"}`);
console.log(`Total episodes: ${episodes.length}`);
console.log(`Duplicate groups found: ${[...groups.values()].filter((g) => g.length > 1).length}`);
console.log(`Rows to DELETE: ${toDelete.length}`);
console.log(`Rows to KEEP:   ${survivors.length}\n`);

// Map each duplicate group to its chosen KEEP row, and build ordered pair list.
const keptByKey = new Map(survivors.map((s) => [`${s.dayType}|${new Date(s.publishDate).getTime()}`, s]));

const fmtDay = (d) => new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));
const fmtCreated = (d) => new Date(d).toISOString().slice(0, 19) + "Z";
const listensOf = (e) => listensByEpisode.get(e.id) || 0;

const pairs = [];
for (const [key, group] of groups.entries()) {
  if (group.length < 2) continue;
  const keep = keptByKey.get(key);
  const deleted = group.filter((r) => r.id !== keep.id);
  pairs.push({ key, keep, deleted });
}

for (let i = 0; i < pairs.length; i++) {
  const { keep, deleted } = pairs[i];
  const pub = fmtDay(keep.publishDate);
  const weekday = String(keep.dayType).padEnd(9);
  const keepL = listensOf(keep);
  const delL = listensOf(deleted[0]);
  const del = deleted[0];
  let note;
  if (keepL !== delL) {
    note = `kept = higher listens (${keepL} vs ${delL})`;
  } else if ((keep.status === "published") !== (del.status === "published")) {
    note = `listen tie (${keepL}) -> kept = ${keep.status === "published" ? "PUBLISHED" : del.status.toUpperCase()} row`;
  } else {
    note = "listen + status tie -> kept = NEWER createdAt";
  }

  console.log(`\n${String(i + 1).padStart(2)}. ${weekday} ${pub}   [${note}]`);
  const show = (tag, row) =>
    console.log(
      `      ${tag}  ${row.id}\n` +
      `            listens=${listensOf(row).toString().padEnd(3)} createdAt=${fmtCreated(row.createdAt)} status=${String(row.status).padEnd(9)} "${row.title}"`
    );
  show("KEEP  ", keep);
  for (const d of deleted) show("DELETE", d);
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
