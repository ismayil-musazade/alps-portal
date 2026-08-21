import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { StatusBadge } from "@/components/ui";
import { GroupSettings, EnrollForm, EndEnrollment } from "@/components/group-controls";

export const dynamic = "force-dynamic";

export default async function GroupDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user || !can(user.role, "groups.view")) redirect("/app");
  const manage = can(user.role, "groups.manage");

  const { id } = await params;
  const group = await db.group.findUnique({
    where: { id },
    include: {
      course: true,
      teacher: { select: { id: true, name: true } },
      enrollments: {
        orderBy: { startDate: "desc" },
        include: { student: { select: { id: true, fullName: true, status: true } } },
      },
    },
  });
  if (!group) notFound();

  const active = group.enrollments.filter((e) => e.status === "ACTIVE");
  const past = group.enrollments.filter((e) => e.status !== "ACTIVE");

  const [teachers, candidates] = await Promise.all([
    db.user.findMany({ where: { role: "TEACHER", status: "ACTIVE" }, select: { id: true, name: true } }),
    manage
      ? db.studentProfile.findMany({
          where: {
            status: { in: ["ACTIVE", "WAITING_GROUP"] },
            enrollments: { none: { groupId: id, status: "ACTIVE" } },
          },
          select: { id: true, fullName: true },
          orderBy: { fullName: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/app/groups" className="text-sm text-ink/50 hover:text-brand">← Groups</Link>
        <h1 className="text-2xl font-extrabold">{group.name}</h1>
        <StatusBadge value={group.status} tone={group.status === "ACTIVE" ? "ok" : group.status === "PLANNED" ? "warn" : "muted"} />
        <span className="text-sm text-ink/50">{group.course.name} · {group.teacher?.name ?? "no teacher"} · {group.schedule ?? "no schedule"}</span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-black/10 bg-white p-4">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink/50">Roster · {active.length} student(s)</h3>
            {manage && group.status !== "FINISHED" && (
              <div className="mb-3"><EnrollForm groupId={group.id} candidates={candidates.map((c) => ({ id: c.id, name: c.fullName }))} /></div>
            )}
            <ul className="divide-y divide-black/5">
              {active.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <Link href={`/app/students/${e.student.id}`} className="font-semibold hover:text-brand">{e.student.fullName}</Link>
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-ink/40">since {e.startDate.toLocaleDateString("en-GB")}</span>
                    {manage && <EndEnrollment enrollmentId={e.id} />}
                  </span>
                </li>
              ))}
              {!active.length && <li className="py-6 text-center text-sm text-ink/40">No active students.</li>}
            </ul>
          </div>

          {past.length > 0 && (
            <div className="rounded-xl border border-black/10 bg-white p-4">
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink/50">Past enrollments</h3>
              <ul className="divide-y divide-black/5">
                {past.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <Link href={`/app/students/${e.student.id}`} className="hover:text-brand">{e.student.fullName}</Link>
                    <span className="flex items-center gap-2">
                      <StatusBadge value={e.status} tone={e.status === "COMPLETED" ? "ok" : "risk"} />
                      <span className="text-xs text-ink/40">{e.endDate?.toLocaleDateString("en-GB")}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {manage && (
          <GroupSettings
            groupId={group.id}
            teachers={teachers}
            current={{ teacherId: group.teacherId ?? "", schedule: group.schedule ?? "", status: group.status }}
          />
        )}
      </div>
    </>
  );
}
