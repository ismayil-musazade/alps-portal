import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { StatusBadge, inputBase } from "@/components/ui";
import { NewTaskForm } from "@/components/staff-task-controls";
import { staffTaskFilter, TASK_STATUS_TONE } from "@/lib/staff-tasks";
import { formatDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";

const STATUSES = ["TODO", "IN_PROGRESS", "SUBMITTED", "APPROVED", "REJECTED"] as const;

type Query = {
  show?: string;
  q?: string;
  status?: string;
  assignee?: string;
  overdue?: string;
};

export default async function TasksPage({ searchParams }: { searchParams: Promise<Query> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!can(user.role, "stafftasks.own")) redirect("/app");

  const sp = await searchParams;
  const isManager = can(user.role, "stafftasks.assign");
  const done = sp.show === "done";
  const q = (sp.q ?? "").trim();
  const status = STATUSES.includes(sp.status as (typeof STATUSES)[number]) ? sp.status : "";
  const assignee = isManager ? (sp.assignee ?? "") : "";
  const overdueOnly = sp.overdue === "1";
  const now = new Date();

  const staff = await db.user.findMany({
    where: { status: "ACTIVE", role: { in: ["MANAGER", "STAFF", "TEACHER"] } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  // Built as an AND list rather than one object: two filters can both mention
  // `status` (say "submitted" and "overdue"), and spreading would silently drop
  // whichever came first.
  const clauses: Prisma.StaffTaskWhereInput[] = [staffTaskFilter(user)];

  // An explicit status wins over the open/completed tabs, so a manager
  // searching for "approved" is not silently handed an empty list.
  clauses.push(
    status
      ? { status: status as (typeof STATUSES)[number] }
      : { status: done ? { in: ["APPROVED"] } : { notIn: ["APPROVED"] } },
  );
  if (assignee) clauses.push({ assignedToId: assignee });
  if (overdueOnly) clauses.push({ dueAt: { lt: now }, status: { not: "APPROVED" } });
  if (q) {
    clauses.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  const where: Prisma.StaffTaskWhereInput = { AND: clauses };

  const tasks = await db.staffTask.findMany({
    where,
    orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    take: 200,
    include: {
      assignedTo: { select: { name: true } },
      parentTask: { select: { id: true } },
      _count: { select: { files: true, comments: true, followUps: true } },
    },
  });

  const filtered = Boolean(q || status || assignee || overdueOnly);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">{isManager ? "Staff tasks" : "My tasks"}</h1>
        <div className="flex gap-1 rounded-full bg-black/5 p-0.5 text-sm">
          <Link
            href="/app/tasks"
            className={`rounded-full px-3 py-1 font-semibold ${!done ? "bg-white shadow-sm" : "text-ink/50"}`}
          >
            Open
          </Link>
          <Link
            href="/app/tasks?show=done"
            className={`rounded-full px-3 py-1 font-semibold ${done ? "bg-white shadow-sm" : "text-ink/50"}`}
          >
            Completed
          </Link>
        </div>
        {isManager && <div className="ml-auto"><NewTaskForm staff={staff} /></div>}
      </div>

      <form method="get" className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-black/10 bg-white p-3">
        {done && <input type="hidden" name="show" value="done" />}
        <input
          name="q"
          defaultValue={q}
          placeholder="Search tasks by title or details…"
          aria-label="Search tasks"
          className={`${inputBase} min-w-[14rem] flex-1`}
        />
        <select name="status" defaultValue={status} aria-label="Status" className={`${inputBase} w-40`}>
          <option value="">Any status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replaceAll("_", " ").toLowerCase()}</option>
          ))}
        </select>
        {isManager && (
          <select name="assignee" defaultValue={assignee} aria-label="Assigned to" className={`${inputBase} w-44`}>
            <option value="">Anyone</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
        <label className="flex items-center gap-1.5 whitespace-nowrap px-1 text-sm font-medium text-ink/70">
          <input type="checkbox" name="overdue" value="1" defaultChecked={overdueOnly} className="h-4 w-4" />
          Overdue only
        </label>
        <button className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-black">
          Search
        </button>
        {filtered && (
          <Link
            href={done ? "/app/tasks?show=done" : "/app/tasks"}
            className="rounded-full border border-black/15 px-4 py-2 text-sm font-semibold hover:bg-black/5"
          >
            Clear
          </Link>
        )}
      </form>

      {filtered && (
        <p className="mt-3 text-sm text-ink/50">
          {tasks.length} {tasks.length === 1 ? "task" : "tasks"} found
          {q ? ` for “${q}”` : ""}
        </p>
      )}

      <div className="mt-3 space-y-2">
        {tasks.map((t) => {
          const overdue = t.dueAt && t.dueAt.getTime() < now.getTime() && t.status !== "APPROVED";
          return (
            <Link
              key={t.id}
              href={`/app/tasks/${t.id}`}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 hover:border-brand/40"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {t.parentTask && (
                    <span title="Follow-up task" className="text-sm font-bold text-brand">↳</span>
                  )}
                  <span className="font-semibold">{t.title}</span>
                  <StatusBadge value={t.status} tone={TASK_STATUS_TONE[t.status]} />
                  {t._count.files > 0 && (
                    <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-bold text-ink/50">
                      {t._count.files} file{t._count.files === 1 ? "" : "s"}
                    </span>
                  )}
                  {t._count.comments > 0 && (
                    <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-bold text-ink/50">
                      {t._count.comments} 💬
                    </span>
                  )}
                  {t._count.followUps > 0 && (
                    <span className="rounded-full bg-brand-tint px-2 py-0.5 text-xs font-bold text-brand-dark">
                      {t._count.followUps} follow-up{t._count.followUps === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-ink/50">
                  {isManager ? `${t.assignedTo.name} · ` : ""}
                  {t.dueAt ? (
                    <span className={overdue ? "font-bold text-risk" : ""}>
                      due {formatDateTime(t.dueAt)}
                      {overdue ? " — overdue" : ""}
                    </span>
                  ) : (
                    "no deadline"
                  )}
                </p>
              </div>
              <span className="text-ink/30">→</span>
            </Link>
          );
        })}
        {!tasks.length && (
          <p className="rounded-xl border border-dashed border-black/15 bg-white px-4 py-10 text-center text-sm text-ink/40">
            {filtered
              ? "Nothing matches that search."
              : done
                ? "Nothing completed yet."
                : isManager
                  ? "No open tasks. Use “New task” to assign one."
                  : "No tasks assigned to you."}
          </p>
        )}
      </div>
    </>
  );
}
