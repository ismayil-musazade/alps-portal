/**
 * Clear the demo data and create the first real manager account.
 *
 * The study-task templates and the course list survive — see KEEP below.
 *
 * Run this once, on the day you start using the portal for real. Everything
 * currently in the database was put there to demonstrate the app; none of it
 * is worth keeping, and leaving it in place means real students sit alongside
 * "Demo Manager" forever.
 *
 *   npx tsx prisma/reset-for-launch.ts                      # shows what it would delete
 *   npx tsx prisma/reset-for-launch.ts --confirm \
 *     --name "Your Name" --email you@example.com            # actually does it
 *
 * Without --confirm it changes nothing. It prints a one-time password at the
 * end; that password is shown once and is not recoverable, so write it down
 * before closing the terminal, and change it as soon as you sign in.
 */
import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";
import crypto from "crypto";

const db = new PrismaClient();

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

/**
 * Catalogue data worth keeping through the reset.
 *
 * The seed put 68 study-task templates and the three course definitions in —
 * that is a real curriculum library, not demonstration noise, and rebuilding
 * it by hand would be a waste of an afternoon. Everything about *people* goes.
 */
const KEEP = ["TaskTemplate", "Course"];

/** Every table Prisma owns, except its own migration bookkeeping. */
async function dataTables(): Promise<string[]> {
  const rows = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
     WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
     ORDER BY tablename`;
  return rows.map((r) => r.tablename);
}

async function main() {
  const confirmed = process.argv.includes("--confirm");
  const name = arg("--name") ?? "Manager";
  const email = arg("--email");

  const tables = await dataTables();
  const clearing = tables.filter((t) => !KEEP.includes(t));

  async function rows(t: string) {
    const [{ count }] = await db.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT count(*)::bigint AS count FROM "${t}"`,
    );
    return Number(count);
  }

  console.log("\nWould be deleted:\n");
  let total = 0;
  for (const t of clearing) {
    const n = await rows(t);
    total += n;
    if (n > 0) console.log(`  ${String(n).padStart(6)}  ${t}`);
  }

  console.log("\nWould be kept:\n");
  for (const t of KEEP) {
    if (tables.includes(t)) console.log(`  ${String(await rows(t)).padStart(6)}  ${t}`);
  }
  console.log(`\n  ${total} rows deleted across ${clearing.length} tables, ${KEEP.length} tables kept\n`);

  if (!confirmed) {
    console.log("Nothing was changed. Re-run with --confirm --name \"Your Name\" --email you@example.com");
    return;
  }
  if (!email) {
    console.log("Refusing to wipe without --email: you would be left with no way to sign in.");
    process.exitCode = 1;
    return;
  }

  // CASCADE means the order does not matter, which is what we want: a missed
  // foreign key here would leave the database half-cleared.
  const list = clearing.map((t) => `"${t}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
  console.log(`Cleared ${clearing.length} tables, kept ${KEEP.join(" and ")}.`);

  const password =
    "alps-" +
    crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 4) +
    "-" +
    crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 4);

  await db.user.create({
    data: {
      name,
      email,
      passwordHash: await hash(password, 12),
      role: Role.MANAGER,
      mustChangePassword: true,
    },
  });

  console.log(`\nManager account created for ${email}`);
  console.log(`One-time password:  ${password}`);
  console.log("\nSign in with it, change it straight away, then add everyone else from Users & Accounts.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
