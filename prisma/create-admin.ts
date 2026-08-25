/**
 * Create the first real manager account on a fresh production database.
 *   npx tsx prisma/create-admin.ts "Full Name" email@alpsacademy.az
 * Prints a one-time temporary password. The account must change it at first login.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const db = new PrismaClient();

async function main() {
  const [name, email] = process.argv.slice(2);
  if (!name || !email) {
    console.error('Usage: npx tsx prisma/create-admin.ts "Full Name" email@alpsacademy.az');
    process.exit(1);
  }
  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    console.error(`A user with ${email} already exists.`);
    process.exit(1);
  }
  const tempPassword =
    "alps-" + crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 4) +
    "-" + crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 4);

  await db.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash: await bcrypt.hash(tempPassword, 12),
      role: "MANAGER",
      mustChangePassword: true,
    },
  });

  console.log("\nManager account created.");
  console.log(`  Login:    ${email}`);
  console.log(`  Password: ${tempPassword}`);
  console.log("\nThis password is shown once and must be changed at first login.\n");
}

main().finally(() => db.$disconnect());
