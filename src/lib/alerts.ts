import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * Dashboard alerts (Build Brief §15).
 * Every query is scoped by the caller: managers see the academy,
 * teachers only their own groups' students.
 */

export type StudentAlert = {
  id: string;
  name: string;
  detail: string;
  tone: "warn" | "risk";
};

const LOW_ATTENDANCE = 80;   // %
const RISK_ATTENDANCE = 60;  // %

/** Students whose attendance has fallen below the threshold. */
export async function lowAttendance(where: Prisma.StudentProfileWhereInput, limit = 8): Promise<StudentAlert[]> {
  const students = await db.studentProfile.findMany({
    where: { ...where, status: "ACTIVE" },
    select: { id: true, fullName: true, attendance: { select: { status: true } } },
  });
  return students
    .map((s) => {
      const total = s.attendance.length;
      if (total < 3) return null; // too few lessons to judge
      const present = s.attendance.filter((a) => a.status !== "ABSENT").length;
      const pct = Math.round((present / total) * 100);
      if (pct >= LOW_ATTENDANCE) return null;
      return {
        id: s.id, name: s.fullName,
        detail: `${pct}% attendance (${total - present} absence(s) of ${total})`,
        tone: pct < RISK_ATTENDANCE ? ("risk" as const) : ("warn" as const),
      };
    })
    .filter(Boolean)
    .slice(0, limit) as StudentAlert[];
}

/** Students with tasks marked missing, or past deadline and not done. */
export async function missingTasks(where: Prisma.StudentProfileWhereInput, limit = 8): Promise<StudentAlert[]> {
  const now = new Date();
  const students = await db.studentProfile.findMany({
    where: {
      ...where, status: "ACTIVE",
      tasks: {
        some: {
          OR: [
            { status: "MISSING" },
            { status: { in: ["NOT_STARTED", "IN_PROGRESS"] }, deadline: { lt: now } },
          ],
        },
      },
    },
    select: {
      id: true, fullName: true,
      tasks: {
        where: {
          OR: [
            { status: "MISSING" },
            { status: { in: ["NOT_STARTED", "IN_PROGRESS"] }, deadline: { lt: now } },
          ],
        },
        select: { title: true },
      },
    },
    take: limit,
  });
  return students.map((s) => ({
    id: s.id, name: s.fullName,
    detail: `${s.tasks.length} overdue: ${s.tasks.slice(0, 2).map((t) => t.title).join(", ")}${s.tasks.length > 2 ? "…" : ""}`,
    tone: s.tasks.length > 2 ? ("risk" as const) : ("warn" as const),
  }));
}

/** Students whose latest exam is still below their target (numeric targets only). */
export async function belowTarget(where: Prisma.StudentProfileWhereInput, limit = 8): Promise<StudentAlert[]> {
  const students = await db.studentProfile.findMany({
    where: { ...where, status: "ACTIVE", goals: { some: {} }, exams: { some: {} } },
    select: {
      id: true, fullName: true,
      goals: { orderBy: { updatedAt: "desc" }, take: 1, select: { targetOverall: true } },
      exams: { orderBy: { examDate: "desc" }, take: 1, select: { totalScore: true, examType: true } },
    },
    take: 50,
  });
  return students
    .map((s) => {
      const target = Number(s.goals[0]?.targetOverall);
      const latest = Number(s.exams[0]?.totalScore);
      if (!Number.isFinite(target) || !Number.isFinite(latest) || latest >= target) return null;
      const gap = Math.round(((target - latest) / target) * 100);
      return {
        id: s.id, name: s.fullName,
        detail: `${s.exams[0].examType.toLowerCase()} ${latest} vs target ${target}`,
        tone: gap > 15 ? ("risk" as const) : ("warn" as const),
      };
    })
    .filter(Boolean)
    .slice(0, limit) as StudentAlert[];
}

/** Active students with no task scored or exam recorded in the last N days. */
export async function staleProgress(where: Prisma.StudentProfileWhereInput, days = 21, limit = 8): Promise<StudentAlert[]> {
  const cutoff = new Date(Date.now() - days * 86400_000);
  const students = await db.studentProfile.findMany({
    where: {
      ...where, status: "ACTIVE",
      tasks: { none: { updatedAt: { gte: cutoff } } },
      exams: { none: { createdAt: { gte: cutoff } } },
    },
    select: {
      id: true, fullName: true,
      enrollments: { where: { status: "ACTIVE" }, take: 1, select: { teacher: { select: { name: true } } } },
    },
    take: limit,
  });
  return students.map((s) => ({
    id: s.id, name: s.fullName,
    detail: `no updates in ${days} days${s.enrollments[0]?.teacher ? ` · ${s.enrollments[0].teacher.name}` : ""}`,
    tone: "warn" as const,
  }));
}

/** Students missing key profile fields — staff follow-up list. */
export async function incompleteDetails(limit = 8): Promise<StudentAlert[]> {
  const students = await db.studentProfile.findMany({
    where: {
      status: { in: ["ACTIVE", "WAITING_GROUP"] },
      OR: [{ parentPhone: null }, { school: null }, { currentLevel: null }],
    },
    select: { id: true, fullName: true, parentPhone: true, school: true, currentLevel: true },
    take: limit,
  });
  return students.map((s) => {
    const missing = [
      !s.parentPhone && "parent phone",
      !s.school && "school",
      !s.currentLevel && "current level",
    ].filter(Boolean);
    return { id: s.id, name: s.fullName, detail: `missing ${missing.join(", ")}`, tone: "warn" as const };
  });
}

/** Goals with a target exam date coming up. */
export async function upcomingExams(where: Prisma.StudentProfileWhereInput, days = 60, limit = 8) {
  const until = new Date(Date.now() + days * 86400_000);
  const goals = await db.goal.findMany({
    where: { targetExamDate: { gte: new Date(), lte: until }, student: { ...where, status: "ACTIVE" } },
    orderBy: { targetExamDate: "asc" },
    take: limit,
    select: {
      id: true, targetExamDate: true, targetOverall: true, courseType: true,
      student: { select: { id: true, fullName: true } },
    },
  });
  return goals.map((g) => ({
    id: g.student.id,
    name: g.student.fullName,
    detail: `${g.courseType.replaceAll("_", " ")} ${g.targetOverall ?? ""} · ${g.targetExamDate!.toLocaleDateString("en-GB")}`,
    tone: "warn" as const,
  }));
}
