import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { dueTone, dueLabel, startOfToday } from "@/lib/reminders";
import { formatDateTime } from "@/lib/time";
import { AddReminder, ReminderActions, BellIcon } from "@/components/reminder-controls";

export const dynamic = "force-dynamic";

const TONE: Record<string, string> = {
  risk: "bg-risk/10 text-risk",
  warn: "bg-warn/10 text-warn",
  muted: "bg-black/5 text-ink/60",
};

type Row = {
  id: string;
  title: string;
  body: string | null;
  dueAt: Date;
  status: string;
  lead: { id: string; fullName: string } | null;
  student: { id: string; fullName: string } | null;
  createdBy: { name: string };
};

function Group({ title, rows, hint }: { title: string; rows: Row[]; hint?: string }) {
  if (!rows.length) return null;
  return (
    <section className="rounded-xl border border-black/10 bg-white p-4">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink/50">
        {title} <span className="text-ink/30">({rows.length})</span>
        {hint && <span className="ml-2 font-normal normal-case text-ink/35">{hint}</span>}
      </h2>
      <ul className="space-y-2">
        {rows.map((r) => {
          const target = r.lead
            ? { href: `/app/leads/${r.lead.id}`, name: r.lead.fullName, kind: "lead" }
            : r.student
              ? { href: `/app/students/${r.student.id}`, name: r.student.fullName, kind: "student" }
              : null;
          return (
            <li
              key={r.id}
              className={`flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm ${
                r.status === "OPEN" ? "bg-paper" : "bg-paper/50 opacity-60"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`font-semibold ${r.status !== "OPEN" ? "line-through" : ""}`}>
                    {r.title}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      r.status === "OPEN" ? TONE[dueTone(r.dueAt)] : TONE.muted
                    }`}
                  >
                    {dueLabel(r.dueAt)}
                  </span>
                  {target && (
                    <Link
                      href={target.href}
                      className="rounded-full bg-brand-tint px-2 py-0.5 text-xs font-bold text-brand-dark hover:bg-brand/20"
                    >
                      {target.name} →
                    </Link>
                  )}
                </div>
                {r.body && <p className="mt-0.5 text-ink/70">{r.body}</p>}
                <p className="mt-0.5 text-xs text-ink/40">
                  {formatDateTime(r.dueAt, { weekday: "short", day: "numeric", month: "short" })}
                  {" · set by "}{r.createdBy.name}
                </p>
              </div>
              <ReminderActions id={r.id} status={r.status} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default async function RemindersPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!can(user.role, "reminders.use")) redirect("/app");

  const staff = can(user.role, "reminders.assign.others")
    ? await db.user.findMany({
        where: { status: "ACTIVE", role: { in: ["MANAGER", "STAFF", "TEACHER"] }, id: { not: user.id } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : undefined;

  const include = {
    lead: { select: { id: true, fullName: true } },
    student: { select: { id: true, fullName: true } },
    createdBy: { select: { name: true } },
  } as const;

  const [open, done] = await Promise.all([
    db.reminder.findMany({
      where: { assignedToId: user.id, status: "OPEN" },
      orderBy: { dueAt: "asc" },
      include,
    }),
    db.reminder.findMany({
      where: { assignedToId: user.id, status: { not: "OPEN" } },
      orderBy: { completedAt: "desc" },
      take: 15,
      include,
    }),
  ]);

  const today = startOfToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const overdue = open.filter((r) => r.dueAt < today);
  const dueToday = open.filter((r) => r.dueAt >= today && r.dueAt < tomorrow);
  const thisWeek = open.filter((r) => r.dueAt >= tomorrow && r.dueAt < weekEnd);
  const later = open.filter((r) => r.dueAt >= weekEnd);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold">
          <BellIcon className="h-6 w-6 text-brand" /> Reminders
        </h1>
        <span className="text-sm text-ink/50">{open.length} open</span>
        <div className="ml-auto">
          <AddReminder staff={staff} />
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <Group title="Overdue" rows={overdue} />
        <Group title="Today" rows={dueToday} />
        <Group title="This week" rows={thisWeek} />
        <Group title="Later" rows={later} />
        <Group title="Recently completed" rows={done} />
        {!open.length && !done.length && (
          <p className="rounded-xl border border-dashed border-black/15 bg-white px-4 py-10 text-center text-sm text-ink/40">
            Nothing to remember yet. Use <strong>Set reminder</strong> above, or the bell on any
            lead or student.
          </p>
        )}
      </div>
    </>
  );
}
