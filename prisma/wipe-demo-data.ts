/**
 * Remove all demo/seed data from a database, keeping real accounts.
 *   npx tsx prisma/wipe-demo-data.ts
 * Deletes the five @alps.local demo users and every student, lead, group and
 * course created by the seed. Run this BEFORE entering real student data.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const demoEmails = [
    "manager@alps.local", "staff@alps.local", "teacher@alps.local",
    "student@alps.local", "parent@alps.local",
  ];

  const remaining = await db.user.count({ where: { email: { notIn: demoEmails }, role: "MANAGER" } });
  if (remaining === 0) {
    console.error("Refusing to wipe: no real manager account exists yet.");
    console.error('Run: npx tsx prisma/create-admin.ts "Your Name" you@alpsacademy.az');
    process.exit(1);
  }

  // order matters — children before parents
  await db.$transaction([
    db.attendance.deleteMany({}),
    db.studentTask.deleteMany({}),
    db.studentSkillStatus.deleteMany({}),
    db.exam.deleteMany({}),
    db.reportCard.deleteMany({}),
    db.goal.deleteMany({}),
    db.internalNote.deleteMany({}),
    db.enrollment.deleteMany({}),
    db.parentLink.deleteMany({}),
    db.leadActivity.deleteMany({}),
    db.studentProfile.deleteMany({}),
    db.lead.deleteMany({}),
    db.group.deleteMany({}),
    db.course.deleteMany({}),
    db.taskTemplate.deleteMany({}),
    db.loginAttempt.deleteMany({}),
    db.user.deleteMany({ where: { email: { in: demoEmails } } }),
  ]);

  console.log("Demo data removed. Real manager account(s) kept.");
  console.log("Note: task templates were deleted too — reseed them if needed.");
}

main().finally(() => db.$disconnect());
