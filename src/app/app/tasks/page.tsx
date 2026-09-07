import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { StatusBadge } from "@/components/ui";
import { NewTaskForm } from "@/components/staff-task-controls";
import { staffTaskFilter, TASK_STATUS_TONE } from "@/lib/staff-tasks";

export const dynamic = "force-dynamic";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!can(user.role, "stafftasks.own")) redirect("/app");

  const { show } = await searchParams;
  const isManager = can(user.role, "stafftasks.assign");
  const done = show === "done";

  const tasks = await db.staffTask.findMany({
    where: {
      ...staffTaskFilter(user),
      status: done ? { in: ["APPROVED"] } : { notIn: ["APPROVED"] },
    },
    orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    include: {
      assignedTo: { select: { name: true } },
      _count: { select: { files: true } },
    },
  });

  const staff = isManager
    ? await db.user.findMany({
        where: { status: "ACTIVE", role: { in: ["MANAGER", "STAFF", "TEACHER"] } },
        select: { id: true, name: true, role: true },
        orderBy: { name: "asc" },
      })
    : [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

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

      <div className="mt-5 space-y-2">
        {tasks.map((t) => {
          const overdue = t.dueAt && t.dueAt < today && t.status !== "APPROVED";
          return (
            <Link
              key={t.id}
              href={`/app/tasks/${t.id}`}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 hover:border-brand/40"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{t.title}</span>
                  <StatusBadge value={t.status} tone={TASK_STATUS_TONE[t.status]} />
                  {t._count.files > 0 && (
                    <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-bold text-ink/50">
                      {t._count.files} file{t._count.files === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-ink/50">
                  {isManager ? `${t.assignedTo.name} · ` : ""}
                  {t.dueAt ? (
                    <span className={overdue ? "font-bold text-risk" : ""}>
                      due {t.dueAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
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
            {done
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
