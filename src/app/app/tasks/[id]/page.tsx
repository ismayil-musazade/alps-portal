import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { StatusBadge } from "@/components/ui";
import {
  StatusPicker, FileUpload, FileReview, DeleteFileButton, DeleteTaskButton, ManagerNote,
} from "@/components/staff-task-controls";
import {
  loadTask, allowedStatuses, humanSize, MAX_FILE_LABEL,
  TASK_STATUS_TONE, FILE_STATUS_TONE,
} from "@/lib/staff-tasks";

export const dynamic = "force-dynamic";

export default async function TaskDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!can(user.role, "stafftasks.own")) redirect("/app");

  const { id } = await params;
  const task = await loadTask(user, id);
  if (!task) notFound();

  const isManager = can(user.role, "stafftasks.assign");
  const isAssignee = task.assignedToId === user.id;
  const statuses = allowedStatuses(user, task.assignedToId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = task.dueAt && task.dueAt < today && task.status !== "APPROVED";

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/app/tasks" className="text-sm text-ink/50 hover:text-brand">← Tasks</Link>
        <h1 className="text-2xl font-extrabold">{task.title}</h1>
        <StatusBadge value={task.status} tone={TASK_STATUS_TONE[task.status]} />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <StatusPicker taskId={task.id} status={task.status} options={statuses} />
          {isManager && <DeleteTaskButton taskId={task.id} />}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {task.description && (
            <div className="rounded-xl border border-black/10 bg-white p-4">
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink/50">Details</h3>
              <p className="whitespace-pre-line text-sm text-ink/80">{task.description}</p>
            </div>
          )}

          <div className="rounded-xl border border-black/10 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wide text-ink/50">
                Files <span className="text-ink/30">({task.files.length})</span>
              </h3>
              {(isManager || isAssignee) && <FileUpload taskId={task.id} maxLabel={MAX_FILE_LABEL} />}
            </div>

            <ul className="space-y-2">
              {task.files.map((f) => {
                const canDelete = isManager || (f.uploadedById === user.id && f.status === "PENDING");
                return (
                  <li key={f.id} className="rounded-lg bg-paper px-3 py-2.5">
                    <div className="flex flex-wrap items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={`/api/staff-tasks/files/${f.id}/download`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-ink hover:text-brand"
                          >
                            {f.filename}
                          </a>
                          <StatusBadge value={f.status} tone={FILE_STATUS_TONE[f.status]} />
                        </div>
                        <p className="mt-0.5 text-xs text-ink/40">
                          {humanSize(f.size)} · {f.uploadedBy.name} ·{" "}
                          {f.createdAt.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                        </p>
                        {f.reviewNote && (
                          <p className="mt-1 rounded bg-white px-2 py-1 text-sm text-ink/70">
                            <span className="font-semibold">Manager:</span> {f.reviewNote}
                          </p>
                        )}
                      </div>
                      {isManager && <FileReview fileId={f.id} status={f.status} reviewNote={f.reviewNote} />}
                      {canDelete && <DeleteFileButton fileId={f.id} />}
                    </div>
                  </li>
                );
              })}
              {!task.files.length && (
                <li className="py-4 text-center text-sm text-ink/40">Nothing uploaded yet.</li>
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-black/10 bg-white p-4">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink/50">Manager&rsquo;s note</h3>
            {isManager ? (
              <ManagerNote taskId={task.id} value={task.managerNote ?? ""} />
            ) : task.managerNote ? (
              <p className="whitespace-pre-line text-sm text-ink/80">{task.managerNote}</p>
            ) : (
              <p className="text-sm text-ink/40">No note yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-black/10 bg-white p-4 text-sm">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink/50">About</h3>
          {[
            ["Assigned to", task.assignedTo.name],
            ["Set by", task.createdBy.name],
            ["Deadline", task.dueAt ? task.dueAt.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : "—"],
            ["Created", task.createdAt.toLocaleDateString("en-GB")],
            ["Completed", task.completedAt?.toLocaleDateString("en-GB") ?? "—"],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-dashed border-black/5 py-1.5 last:border-0">
              <span className="text-ink/50">{label}</span>
              <span className={`text-right font-medium ${label === "Deadline" && overdue ? "text-risk" : ""}`}>
                {value}
              </span>
            </div>
          ))}
          {overdue && (
            <p className="mt-2 rounded-lg bg-risk/10 px-3 py-2 text-xs font-bold text-risk">Past its deadline</p>
          )}
        </div>
      </div>
    </>
  );
}
