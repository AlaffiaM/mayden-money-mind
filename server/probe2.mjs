import "dotenv/config";

const testUrl = new URL(process.env.DATABASE_URL);
testUrl.searchParams.set("schema", "test");
process.env.DATABASE_URL = testUrl.toString();

const { prisma } = await import("./src/config/prisma.js");

// Generated query
const subs = await prisma.subscription.count();
console.log("generated prisma.subscription.count ->", subs);

// Raw query schema resolution
const cur = await prisma.$queryRawUnsafe("select current_schema() as s");
console.log("raw current_schema ->", cur[0].s);

try {
  const rawCount = await prisma.$queryRawUnsafe('select count(*)::int as n from "Subscription"');
  console.log('raw "Subscription" count ->', rawCount[0].n);
} catch (e) {
  console.log('raw "Subscription" err ->', e.message.split("\n")[0]);
}

// Does raw DELETE delete from test or public? Create a user via generated API in test, then raw delete.
const u = await prisma.user.create({ data: { fullName: "RawDeleter", email: "rawdel@test.com", passwordHash: "x", role: "user" } });
console.log("created user id", u.id, "(should be in test schema)");
await prisma.$executeRawUnsafe('DELETE FROM "User" WHERE email = \'rawdel@test.com\'');
const after = await prisma.user.findUnique({ where: { email: "rawdel@test.com" } });
console.log("remaining rawdel@test.com after raw DELETE ->", after ? "STILL EXISTS (raw delete hit public, not test!)" : "gone (raw delete hit test)");

await prisma.$disconnect();
