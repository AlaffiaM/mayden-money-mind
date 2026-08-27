// Probe: exercise src/config/prisma.js against (a) a localhost URL (must NOT add
// sslmode=require → reaches server, fails only at auth), and (b) the real Render
// URL from .env (must ADD sslmode=require and connect OK).
process.env.DATABASE_URL = process.argv[2];
const { prisma } = await import("./src/config/prisma.js");
try {
  const r = await prisma.$queryRaw`select 1 as ok, current_setting('server_version') as pg`;
  console.log("CONNECT_OK |", JSON.stringify(r[0]));
} catch (e) {
  console.log("CONNECT_FAIL |", e.message.split("\n")[0]);
} finally {
  await prisma.$disconnect();
}