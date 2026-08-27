import "dotenv/config";

const testUrl = new URL(process.env.DATABASE_URL);
testUrl.searchParams.set("schema", "test");
process.env.DATABASE_URL = testUrl.toString();

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Try setting search_path via pg pool `options` startup parameter
const schema = "test";
const adapter = new PrismaPg(
  { connectionString: process.env.DATABASE_URL, options: `-c search_path=${schema}` },
  { schema }
);
const prisma = new PrismaClient({ adapter });

const cur = await prisma.$queryRawUnsafe("select current_schema() as s");
console.log("raw current_schema ->", cur[0].s);

try {
  const rawSubs = await prisma.$queryRawUnsafe('select count(*)::int as n from "Subscription"');
  console.log('raw "Subscription" count ->', rawSubs[0].n);
} catch (e) {
  console.log("raw err ->", e.message.split("\n")[0]);
}
await prisma.$disconnect();
