import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { inputCls } from "@/components/ui";
import { AttendanceSheet } from "@/components/attendance-sheet";

export const dynamic = "force-dynamic";

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ group?: string; date?: string }> }) {
  const user = await currentUser();
  if (!user || !can(user.role, "attendance.mark")) redirect("/app");

  const groups = await db.group.findMany({
    where: {
      status: "ACTIVE",
      ...(user.role === "TEACHER" ? { teacherId: user.id } : {}),
    },
    include: { course: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "") ? (sp.date as string) : today;
  const groupId = groups.some((g) => g.id === sp.group) ? (sp.group as string) : groups[0]?.id;

  const roster = groupId
    ? await db.enrollment.findMany({
        where: { groupId, status: "ACTIVE" },
        include: { student: { select: { id: true, fullName: true } } },
        orderBy: { student: { fullName: "asc" } },
      })
    : [];

  const existing = groupId
    ? await db.attendance.findMany({ where: { groupId, lessonDate: new Date(date) } })
    : [];
  const byStudent = new Map(existing.map((a) => [a.studentId, a.status]));

  return (
    <>
      <h1 className="text-2xl font-extrabold">Attendance</h1>

      <form method="get" className="mt-4 flex flex-wrap gap-2">
        <select name="group" defaultValue={groupId} className={`${inputCls} w-auto min-w-56`}>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name} · {g.course.name}</option>)}
        </select>
        <input type="date" name="date" defaultValue={date} className={`${inputCls} w-auto`} />
        <button className="rounded-lg border border-black/15 bg-white px-4 py-2 text-sm font-semibold hover:bg-black/5">Load</button>
      </form>

      {!groups.length ? (
        <p className="mt-8 text-center text-ink/40">No active groups assigned to you.</p>
      ) : (
        <div className="mt-4 max-w-2xl">
          <AttendanceSheet
            groupId={groupId!}
            lessonDate={date}
            roster={roster.map((e) => ({
              studentId: e.student.id,
              name: e.student.fullName,
              current: byStudent.get(e.student.id) ?? null,
            }))}
          />
          {existing.length > 0 && (
            <p className="mt-2 text-xs text-ink/40">This lesson was already marked — saving updates the existing records.</p>
          )}
        </div>
      )}
    </>
  );
}
