import { db } from "@/lib/db";
import { startOfToday, daysFromToday, formatDate, formatTime } from "@/lib/time";

export { startOfToday };

/** Default hour for a reminder created from a date with no time on it. */
export const DEFAULT_REMINDER_HOUR = 9;

/** How many open reminders land today or earlier — the number on the bell. */
export async function dueReminderCount(userId: string) {
  const end = startOfToday();
  end.setUTCDate(end.getUTCDate() + 1);
  return db.reminder.count({
    where: { assignedToId: userId, status: "OPEN", dueAt: { lt: end } },
  });
}

export type DueTone = "risk" | "warn" | "muted";

/** Already past → red, still to come today → amber, later → grey. */
export function dueTone(dueAt: Date, now: Date = new Date()): DueTone {
  if (dueAt.getTime() < now.getTime()) return "risk";
  if (daysFromToday(dueAt, now) === 0) return "warn";
  return "muted";
}

/** "today 14:30", "tomorrow 09:00", "3 days overdue", "12 Sep, 09:00". */
export function dueLabel(dueAt: Date, now: Date = new Date()): string {
  const days = daysFromToday(dueAt, now);
  if (days === 0) return `today ${formatTime(dueAt)}`;
  if (days === 1) return `tomorrow ${formatTime(dueAt)}`;
  if (days === -1) return `yesterday ${formatTime(dueAt)}`;
  if (days < 0) return `${-days} days overdue`;
  return `${formatDate(dueAt)}, ${formatTime(dueAt)}`;
}

/**
 * Keep the automatic "chase this lead" reminder in step with the lead's
 * follow-up date, so setting a date on the lead is all anyone has to do.
 *
 * `reopen` is false when only the note changed — editing the reason for a
 * follow-up someone has already dealt with should not put it back on the bell.
 */
export async function syncLeadFollowUpReminder(opts: {
  leadId: string;
  leadName: string;
  dueAt: Date | null;
  note: string | null;
  ownerId: string;
  actorId: string;
  reopen: boolean;
}) {
  const existing = await db.reminder.findFirst({
    where: { leadId: opts.leadId, kind: "LEAD_FOLLOW_UP" },
    orderBy: { createdAt: "desc" },
  });

  // the follow-up was cancelled — take it off the bell rather than delete it
  if (!opts.dueAt) {
    if (existing && existing.status === "OPEN") {
      await db.reminder.update({
        where: { id: existing.id },
        data: { status: "DISMISSED", completedAt: new Date() },
      });
    }
    return;
  }

  const title = `Follow up: ${opts.leadName}`;
  const body = opts.note?.trim() || null;

  if (existing) {
    await db.reminder.update({
      where: { id: existing.id },
      data: {
        title,
        body,
        dueAt: opts.dueAt,
        assignedToId: opts.ownerId,
        ...(opts.reopen ? { status: "OPEN" as const, completedAt: null } : {}),
      },
    });
    return;
  }

  await db.reminder.create({
    data: {
      title,
      body,
      dueAt: opts.dueAt,
      kind: "LEAD_FOLLOW_UP",
      leadId: opts.leadId,
      assignedToId: opts.ownerId,
      createdById: opts.actorId,
    },
  });
}

/**
 * A staff task with a deadline puts itself on the assignee's bell, and takes
 * itself off again once the manager approves the work.
 */
export async function syncStaffTaskReminder(
  task: { id: string; title: string; dueAt: Date | null; assignedToId: string; status: string },
  actorId: string,
) {
  const existing = await db.reminder.findFirst({
    where: { staffTaskId: task.id, kind: "STAFF_TASK" },
    orderBy: { createdAt: "desc" },
  });
  const finished = task.status === "APPROVED";

  if (!task.dueAt || finished) {
    if (existing && existing.status === "OPEN") {
      await db.reminder.update({
        where: { id: existing.id },
        data: { status: finished ? "DONE" : "DISMISSED", completedAt: new Date() },
      });
    }
    return;
  }

  const title = `Task due: ${task.title}`;

  if (existing) {
    await db.reminder.update({
      where: { id: existing.id },
      data: {
        title,
        dueAt: task.dueAt,
        assignedToId: task.assignedToId,
        status: "OPEN",
        completedAt: null,
      },
    });
    return;
  }

  await db.reminder.create({
    data: {
      title,
      dueAt: task.dueAt,
      kind: "STAFF_TASK",
      staffTaskId: task.id,
      assignedToId: task.assignedToId,
      createdById: actorId,
    },
  });
}
