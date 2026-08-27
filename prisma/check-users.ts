/**
 * Diagnostic: shows which database DATABASE_URL points at, and which
 * accounts exist in it. Never prints passwords.
 *   export DATABASE_URL='...'
 *   npx tsx prisma/check-users.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  const host = url.replace(/^.*@/, "").replace(/\/.*$/, "") || "(not set)";
  console.log(`\nConnected to host: ${host}`);

  const users = await db.user.findMany({
    select: { name: true, email: true, phone: true, role: true, status: true, mustChangePassword: true },
    orderBy: { role: "asc" },
  });

  console.log(`Accounts found: ${users.length}\n`);
  for (const u of users) {
    console.log(`  ${u.role.padEnd(8)} ${(u.email ?? u.phone ?? "-").padEnd(28)} ${u.status}${u.mustChangePassword ? "  (temp password)" : ""}`);
  }

  const [students, leads] = await Promise.all([db.studentProfile.count(), db.lead.count()]);
  console.log(`\nStudents: ${students}   Leads: ${leads}\n`);

  if (users.length === 0) {
    console.log("This database is EMPTY — run 'npm run seed' against this exact DATABASE_URL.\n");
  }
}

main().catch((e) => { console.error("\nConnection failed:", e.message, "\n"); }).finally(() => db.$disconnect());
