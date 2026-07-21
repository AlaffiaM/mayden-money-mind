// Database seed script that creates the initial admin user
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existing) {
    console.log("Admin user already exists, skipping seed.");
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.create({
    data: {
      fullName: "Admin",
      email: adminEmail,
      passwordHash,
      role: "admin",
    },
  });

  console.log(`Admin user created: ${admin.email}`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
