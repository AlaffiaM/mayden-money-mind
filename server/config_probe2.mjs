process.env.DATABASE_URL = "postgresql://postgres:localtest@localhost:5432/postgres";
const { prisma } = await import("./src/config/prisma.js");
try { await prisma.$queryRaw`select 1`; console.log("CONNECT_OK"); }
catch (e) { console.log("FAIL_RAW:", JSON.stringify(e.message)); }
finally { await prisma.$disconnect(); }
