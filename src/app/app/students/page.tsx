import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { studentListFilter } from "@/lib/scope";
import { StatusBadge, inputCls } from "@/components/ui";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_TONE = {
  ACTIVE: "ok", FROZEN: "warn", COMPLETED: "muted", DROPPED: "risk", WAITING_GROUP: "warn",
} as const;

export default async function StudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  // students/parents have their dashboard; the roster is internal
  if (user.role === "STUDENT" || user.role === "PARENT") redirect("/app");

  const sp = await searchParams;
  const q = sp.q?.trim();
  const status = sp.status;
  const courseId = sp.course;

  const where: Prisma.StudentProfileWhereInput = {
    ...studentListFilter(user),
    ...(q ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {}),
    ...(status ? { status: status as never } : {}),
    ...(courseId ? { enrollments: { some: { courseId } } } : {}),
  };

  const [students, courses] = await Promise.all([
    db.studentProfile.findMany({
      where,
      orderBy: { fullName: "asc" },
      include: {
        enrollments: {
          where: { status: "ACTIVE" },
          include: { course: true, group: true, teacher: { select: { name: true } } },
        },
      },
      take: 300,
    }),
    db.course.findMany({ select: { id: true, name: true } }),
  ]);

  return (
    <>
      <h1 className="text-2xl font-extrabold">{user.role === "TEACHER" ? "My Students" : "Students"}</h1>

      <form className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5" method="get">
        <input name="q" defaultValue={q ?? ""} placeholder="Search name / phone" className={`${inputCls} col-span-2`} />
        <select name="status" defaultValue={status ?? ""} className={inputCls}>
          <option value="">All statuses</option>
          {["ACTIVE","FROZEN","COMPLETED","DROPPED","WAITING_GROUP"].map((s) => (
            <option key={s} value={s}>{s.replaceAll("_", " ").toLowerCase()}</option>
          ))}
        </select>
        <select name="course" defaultValue={courseId ?? ""} className={inputCls}>
          <option value="">All courses</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-semibold hover:bg-black/5">Filter</button>
      </form>

      <div className="mt-4 overflow-x-auto rounded-xl border border-black/10 bg-white">
        <table className="w-full min-w-150 text-sm">
          <thead className="bg-paper text-left">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Name</th>
              <th className="px-4 py-2.5 font-semibold">Course / Group</th>
              <th className="px-4 py-2.5 font-semibold">Teacher</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 font-semibold">Start</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const e = s.enrollments[0];
              return (
                <tr key={s.id} className="border-t border-black/5 hover:bg-paper/60">
                  <td className="px-4 py-2.5">
                    <Link href={`/app/students/${s.id}`} className="font-semibold hover:text-brand">{s.fullName}</Link>
                    <div className="text-xs text-ink/40">{s.gradeLevel ? `Grade ${s.gradeLevel}` : ""}</div>
                  </td>
                  <td className="px-4 py-2.5">{e ? `${e.course.name}${e.group ? ` · ${e.group.name}` : ""}` : "—"}</td>
                  <td className="px-4 py-2.5 text-ink/60">{e?.teacher?.name ?? "—"}</td>
                  <td className="px-4 py-2.5"><StatusBadge value={s.status} tone={STATUS_TONE[s.status]} /></td>
                  <td className="px-4 py-2.5 text-ink/60">{s.startDate?.toLocaleDateString("en-GB") ?? "—"}</td>
                </tr>
              );
            })}
            {!students.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-ink/40">No students match.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink/40">{students.length} student(s)</p>
    </>
  );
}
