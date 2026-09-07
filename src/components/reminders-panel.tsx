import { db } from "@/lib/db";
import { dueTone, dueLabel } from "@/lib/reminders";
import { AddReminder, ReminderActions, BellIcon } from "@/components/reminder-controls";

const TONE: Record<string, string> = {
  risk: "bg-risk/10 text-risk",
  warn: "bg-warn/10 text-warn",
  muted: "bg-black/5 text-ink/60",
};

/**
 * Reminder box for one lead or one student. Shows every colleague's reminders
 * on this person — a small team benefits from seeing who is chasing what.
 */
export async function RemindersPanel({
  leadId,
  studentId,
  canEdit,
  staff,
}: {
  leadId?: string;
  studentId?: string;
  canEdit: boolean;
  staff?: { id: string; name: string }[];
}) {
  const reminders = await db.reminder.findMany({
    where: leadId ? { leadId } : { studentId },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    take: 25,
    include: { assignedTo: { select: { name: true } } },
  });

  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-ink/50">
          <BellIcon className="h-3.5 w-3.5" /> Reminders
        </h3>
      </div>

      {canEdit && (
        <div className="mb-3">
          <AddReminder leadId={leadId} studentId={studentId} staff={staff} />
        </div>
      )}

      <ul className="space-y-2">
        {reminders.map((r) => (
          <li
            key={r.id}
            className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
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
              </div>
              {r.body && <p className="mt-0.5 text-ink/70">{r.body}</p>}
              <p className="mt-0.5 text-xs text-ink/40">for {r.assignedTo.name}</p>
            </div>
            {canEdit && <ReminderActions id={r.id} status={r.status} />}
          </li>
        ))}
        {!reminders.length && (
          <li className="py-3 text-center text-sm text-ink/40">No reminders set.</li>
        )}
      </ul>
    </div>
  );
}
