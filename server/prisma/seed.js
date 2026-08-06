// Database seed script that creates the initial admin user
import { prisma } from "../src/config/prisma.js";
import bcrypt from "bcryptjs";

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD env vars are required to seed");
  }
  if (adminPassword.length < 8) {
    console.warn("Warning: ADMIN_PASSWORD is very short. Use a strong password in production.");
  }

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
