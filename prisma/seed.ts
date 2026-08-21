/**
 * Seed: demo accounts for all five roles + realistic sample data.
 * Passwords are demo-only; every account has mustChangePassword=true
 * except the demo logins, so the pilot flow can be tested cleanly.
 */
import { PrismaClient, Role, CourseType, TaskCategory, TaskStatus, ExamType, AttendanceStatus, LeadStatus, LeadSource, SkillStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const hash = (pw: string) => bcrypt.hash(pw, 12);

  // ---- users ----
  const [manager, staff, teacher, studentUser, parentUser] = await Promise.all([
    db.user.create({ data: { name: "Demo Manager", email: "manager@alps.local", passwordHash: await hash("Manager!234"), role: Role.MANAGER, mustChangePassword: false } }),
    db.user.create({ data: { name: "Demo Staff", email: "staff@alps.local", passwordHash: await hash("Staff!234"), role: Role.STAFF, mustChangePassword: false } }),
    db.user.create({ data: { name: "Orkhan Safarov", email: "teacher@alps.local", passwordHash: await hash("Teacher!234"), role: Role.TEACHER, mustChangePassword: false } }),
    db.user.create({ data: { name: "Cavid Cebiyev", phone: "+994501234567", email: "student@alps.local", passwordHash: await hash("Student!234"), role: Role.STUDENT, mustChangePassword: false } }),
    db.user.create({ data: { name: "Parent Cebiyev", phone: "+994507654321", email: "parent@alps.local", passwordHash: await hash("Parent!234"), role: Role.PARENT, mustChangePassword: false } }),
  ]);

  // ---- courses & group ----
  const sat = await db.course.create({ data: { name: "SAT Preparation", type: CourseType.SAT } });
  const ielts = await db.course.create({ data: { name: "IELTS Academic", type: CourseType.IELTS } });
  await db.course.create({ data: { name: "General English", type: CourseType.GENERAL_ENGLISH } });

  const satGroup = await db.group.create({
    data: { name: "SAT Evening A", courseId: sat.id, teacherId: teacher.id, schedule: "Tue/Thu 18:00-20:00" },
  });
  await db.group.create({
    data: { name: "IELTS Morning B", courseId: ielts.id, teacherId: teacher.id, schedule: "Mon/Wed/Fri 10:00-11:30" },
  });

  // ---- student profile + enrollment + parent link ----
  const student = await db.studentProfile.create({
    data: {
      userId: studentUser.id,
      fullName: "Cavid Cebiyev",
      phone: "+994501234567",
      parentName: "Parent Cebiyev",
      parentPhone: "+994507654321",
      school: "School #132",
      gradeLevel: "11",
      currentLevel: "B2",
      previousScores: "SAT diagnostic 1180 (May 2026)",
      strengths: "Strong mental math, consistent homework",
      weaknesses: "Vocabulary in context, reading speed",
      startDate: new Date("2026-06-01"),
    },
  });
  await db.parentLink.create({ data: { parentUserId: parentUser.id, studentId: student.id } });
  await db.enrollment.create({
    data: { studentId: student.id, courseId: sat.id, groupId: satGroup.id, teacherId: teacher.id, startDate: new Date("2026-06-01") },
  });

  // ---- goal ----
  await db.goal.create({
    data: {
      studentId: student.id, courseType: CourseType.SAT,
      targetOverall: "1400", subTargets: { rw: 700, math: 750 },
      targetExamDate: new Date("2026-12-05"),
    },
  });

  // ---- SAT task templates (brief §11) ----
  const templates: { title: string; category: TaskCategory; skillArea?: string; order: number }[] = [];
  for (let i = 1; i <= 10; i++) templates.push({ title: `SAT Practice Test ${i}`, category: TaskCategory.PRACTICE_TEST, order: i });
  for (let i = 1; i <= 20; i++) templates.push({ title: `Vocab List ${i}`, category: TaskCategory.VOCAB_LIST, order: 100 + i });
  for (let i = 1; i <= 30; i++) templates.push({ title: `Reading Article ${i}`, category: TaskCategory.READING_ARTICLE, order: 200 + i });
  const skills = ["Words in Context", "Command of Evidence", "Main Idea", "Inference", "Grammar: punctuation", "Grammar: transitions", "Grammar: sentence boundaries", "Rhetorical Synthesis"];
  for (const [i, s] of skills.entries()) templates.push({ title: s, category: TaskCategory.SKILL_CHECKLIST, skillArea: s, order: 300 + i });
  await db.taskTemplate.createMany({
    data: templates.map((t) => ({ courseType: CourseType.SAT, title: t.title, category: t.category, skillArea: t.skillArea, defaultOrder: t.order })),
  });

  // ---- assigned tasks with mixed statuses ----
  const mk = (title: string, category: TaskCategory, status: TaskStatus, opts: Partial<{ score: number; approved: boolean; comment: string; review: boolean; deadline: string }> = {}) =>
    db.studentTask.create({
      data: {
        studentId: student.id, title, category, courseType: CourseType.SAT,
        status, teacherApproved: opts.approved ?? false, score: opts.score,
        comment: opts.comment, mistakeReviewDone: opts.review ?? false,
        deadline: opts.deadline ? new Date(opts.deadline) : undefined,
        assignedAt: new Date("2026-07-01"),
      },
    });
  await mk("SAT Practice Test 1", TaskCategory.PRACTICE_TEST, TaskStatus.COMPLETED, { score: 4, approved: true, review: true, comment: "1210 — careless errors in geometry" });
  await mk("SAT Practice Test 2", TaskCategory.PRACTICE_TEST, TaskStatus.COMPLETED, { score: 4.5, approved: true, review: false, comment: "1240 — review pending" });
  await mk("Vocab List 1", TaskCategory.VOCAB_LIST, TaskStatus.COMPLETED, { score: 5, approved: true, comment: "Quiz 19/20" });
  await mk("Vocab List 2", TaskCategory.VOCAB_LIST, TaskStatus.COMPLETED, { score: 3, approved: true, comment: "Quiz 13/20 — repeat next week" });
  await mk("Vocab List 3", TaskCategory.VOCAB_LIST, TaskStatus.IN_PROGRESS, { deadline: "2026-08-25" });
  await mk("Reading Article 1", TaskCategory.READING_ARTICLE, TaskStatus.COMPLETED, { score: 4, approved: true, comment: "Good summary" });
  await mk("Reading Article 2", TaskCategory.READING_ARTICLE, TaskStatus.MISSING, { deadline: "2026-08-10" });
  await mk("SAT Practice Test 3", TaskCategory.PRACTICE_TEST, TaskStatus.NOT_STARTED, { deadline: "2026-08-30" });

  // ---- skill statuses ----
  const skillRows: [string, SkillStatus][] = [
    ["Words in Context", SkillStatus.NEEDS_IMPROVEMENT],
    ["Command of Evidence", SkillStatus.LEARNING],
    ["Main Idea", SkillStatus.GOOD],
    ["Inference", SkillStatus.LEARNING],
    ["Grammar: punctuation", SkillStatus.MASTERED],
    ["Grammar: transitions", SkillStatus.GOOD],
    ["Grammar: sentence boundaries", SkillStatus.GOOD],
    ["Rhetorical Synthesis", SkillStatus.NOT_STARTED],
  ];
  for (const [skill, status] of skillRows)
    await db.studentSkillStatus.create({ data: { studentId: student.id, courseType: CourseType.SAT, skill, status } });

  // ---- exams ----
  await db.exam.create({
    data: {
      studentId: student.id, courseType: CourseType.SAT, examType: ExamType.PLACEMENT,
      examDate: new Date("2026-05-28"), totalScore: "1180",
      sectionScores: { rw: 590, math: 590 },
      teacherComment: "Solid base; vocabulary is the main gap.",
      recommendedAction: "Vocab lists 1-5 before first mock", createdById: teacher.id,
    },
  });
  await db.exam.create({
    data: {
      studentId: student.id, courseType: CourseType.SAT, examType: ExamType.MOCK,
      examDate: new Date("2026-08-10"), totalScore: "1240",
      sectionScores: { rw: 610, math: 630 },
      teacherComment: "Improving. Reading timing still tight.",
      recommendedAction: "Two timed reading sections per week", createdById: teacher.id,
    },
  });

  // ---- attendance (12 lessons, 2 absences, 1 late) ----
  const dates = ["07-01","07-03","07-08","07-10","07-15","07-17","07-22","07-24","07-29","07-31","08-05","08-07"];
  for (const [i, d] of dates.entries()) {
    const status = i === 4 ? AttendanceStatus.ABSENT : i === 9 ? AttendanceStatus.ABSENT : i === 6 ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
    await db.attendance.create({
      data: { studentId: student.id, groupId: satGroup.id, lessonDate: new Date(`2026-${d}`), status, markedById: teacher.id },
    });
  }

  // ---- report card (published) ----
  await db.reportCard.create({
    data: {
      studentId: student.id, period: "2026-07",
      metrics: { attendancePct: 83, taskCompletionPct: 63, avgQuality: 4.1, latestExam: "SAT Mock 1240", placement: "1180", target: "1400" },
      strengths: "Math problem solving, consistency",
      weaknesses: "Vocabulary in context, reading speed",
      nextTarget: "Mock 2 above 1300 by end of September",
      teacherComment: "Cavid is progressing steadily. Focused vocabulary work will unlock the next 60-80 points.",
      publishedAt: new Date("2026-08-01"), createdById: teacher.id,
    },
  });

  // ---- internal note (must NEVER reach student/parent) ----
  await db.internalNote.create({
    data: { studentId: student.id, authorId: manager.id, visibility: "MANAGER_ONLY", body: "Family asked about installment payments — follow up in September." },
  });

  // ---- CRM leads ----
  const lead1 = await db.lead.create({
    data: {
      fullName: "Aysel Mammadova", phone: "+994551112233", parentName: "R. Mammadov", parentPhone: "+994551112234",
      school: "School #6", gradeLevel: "10", source: LeadSource.INSTAGRAM, interestedCourse: CourseType.IELTS,
      targetScore: "7.0", status: LeadStatus.CONTACTED, responsibleStaffId: staff.id,
      firstContactAt: new Date("2026-08-15"), nextFollowUpAt: new Date("2026-08-24"),
      lastContactNote: "Asked about morning groups; will discuss with parents.",
    },
  });
  await db.leadActivity.create({ data: { leadId: lead1.id, authorId: staff.id, type: "CALL", body: "First call — interested in IELTS morning group, target 7.0." } });
  await db.lead.create({
    data: {
      fullName: "Tural Aliyev", phone: "+994553334455", source: LeadSource.WHATSAPP, interestedCourse: CourseType.SAT,
      targetScore: "1450", status: LeadStatus.PLACEMENT_BOOKED, responsibleStaffId: staff.id,
      nextFollowUpAt: new Date("2026-08-23"), lastContactNote: "Placement exam booked for Saturday 11:00.",
    },
  });
  await db.lead.create({
    data: {
      fullName: "Nilufar Hasanova", phone: "+994555556677", source: LeadSource.REFERRAL, interestedCourse: CourseType.GENERAL_ENGLISH,
      status: LeadStatus.NEW, responsibleStaffId: staff.id, nextFollowUpAt: new Date("2026-08-22"),
    },
  });

  console.log("Seed complete.");
  console.log("Logins: manager@alps.local / Manager!234 · staff@alps.local / Staff!234 · teacher@alps.local / Teacher!234 · student@alps.local / Student!234 · parent@alps.local / Parent!234");
}

main().finally(() => db.$disconnect());
