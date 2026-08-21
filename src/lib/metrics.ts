import { db } from "@/lib/db";

/** Performance summary per brief §13 — computed live, never stored (except frozen into report cards). */
export async function studentMetrics(studentId: string) {
  const [attendance, tasks, latestExam, placement, goal] = await Promise.all([
    db.attendance.findMany({ where: { studentId } }),
    db.studentTask.findMany({ where: { studentId } }),
    db.exam.findFirst({ where: { studentId }, orderBy: { examDate: "desc" } }),
    db.exam.findFirst({ where: { studentId, examType: "PLACEMENT" }, orderBy: { examDate: "asc" } }),
    db.goal.findFirst({ where: { studentId }, orderBy: { updatedAt: "desc" } }),
  ]);

  const present = attendance.filter((a) => a.status !== "ABSENT").length;
  const attendancePct = attendance.length ? Math.round((present / attendance.length) * 100) : null;

  const approved = tasks.filter((t) => t.teacherApproved).length;
  const taskPct = tasks.length ? Math.round((approved / tasks.length) * 100) : null;

  const scored = tasks.filter((t) => t.score != null);
  const avgQuality = scored.length
    ? Math.round((scored.reduce((s, t) => s + (t.score ?? 0), 0) / scored.length) * 10) / 10
    : null;

  // warning status: red if any metric is bad, yellow if borderline
  let warning: "green" | "yellow" | "red" = "green";
  if ((attendancePct ?? 100) < 60 || (taskPct ?? 100) < 40) warning = "red";
  else if ((attendancePct ?? 100) < 80 || (taskPct ?? 100) < 70) warning = "yellow";

  return {
    attendancePct,
    absences: attendance.filter((a) => a.status === "ABSENT").length,
    taskPct,
    tasksAssigned: tasks.length,
    tasksApproved: approved,
    avgQuality,
    latestExam,
    placement,
    goal,
    warning,
  };
}
