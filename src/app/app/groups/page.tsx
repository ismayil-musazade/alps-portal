import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { StatusBadge } from "@/components/ui";
import { CourseForm, GroupForm } from "@/components/group-controls";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const user = await currentUser();
  if (!user || !can(user.role, "groups.view")) redirect("/app");
  const manage = can(user.role, "groups.manage");

  const [courses, groups, teachers] = await Promise.all([
    db.course.findMany({ include: { _count: { select: { enrollments: { where: { status: "ACTIVE" } } } } }, orderBy: { name: "asc" } }),
    db.group.findMany({
      include: {
        course: { select: { name: true } },
        teacher: { select: { name: true } },
        _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
    db.user.findMany({ where: { role: "TEACHER", status: "ACTIVE" }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Courses &amp; Groups</h1>
        {manage && <div className="flex gap-2"><CourseForm /><GroupForm courses={courses.map((c) => ({ id: c.id, name: c.name }))} teachers={teachers} /></div>}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {courses.map((c) => (
          <div key={c.id} className="rounded-xl border border-black/10 bg-white p-4">
            <div className="font-bold">{c.name}</div>
            <div className="text-xs text-ink/50">{c.type.replaceAll("_", " ")}</div>
            <div className="mt-1 text-sm text-ink/60">{c._count.enrollments} active student(s)</div>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-black/10 bg-white">
        <table className="w-full min-w-150 text-sm">
          <thead className="bg-paper text-left">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Group</th>
              <th className="px-4 py-2.5 font-semibold">Course</th>
              <th className="px-4 py-2.5 font-semibold">Teacher</th>
              <th className="px-4 py-2.5 font-semibold">Schedule</th>
              <th className="px-4 py-2.5 font-semibold">Students</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id} className="border-t border-black/5 hover:bg-paper/60">
                <td className="px-4 py-2.5">
                  <Link href={`/app/groups/${g.id}`} className="font-semibold hover:text-brand">{g.name}</Link>
                </td>
                <td className="px-4 py-2.5">{g.course.name}</td>
                <td className="px-4 py-2.5 text-ink/60">{g.teacher?.name ?? "—"}</td>
                <td className="px-4 py-2.5 text-ink/60">{g.schedule ?? "—"}</td>
                <td className="px-4 py-2.5 font-semibold">{g._count.enrollments}</td>
                <td className="px-4 py-2.5">
                  <StatusBadge value={g.status} tone={g.status === "ACTIVE" ? "ok" : g.status === "PLANNED" ? "warn" : "muted"} />
                </td>
              </tr>
            ))}
            {!groups.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-ink/40">No groups yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
