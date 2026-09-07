import { db } from "@/lib/db";

/** Start of today in the server's timezone — reminders are day-granular. */
export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** How many open reminders are already due — the number on the bell. */
export async function dueReminderCount(userId: string) {
  const end = startOfToday();
  end.setDate(end.getDate() + 1);
  return db.reminder.count({
    where: { assignedToId: userId, status: "OPEN", dueAt: { lt: end } },
  });
}

export type DueTone = "risk" | "warn" | "muted";

/** Overdue → red, due today → amber, later → grey. */
export function dueTone(dueAt: Date): DueTone {
  const today = startOfToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dueAt < today) return "risk";
  if (dueAt < tomorrow) return "warn";
  return "muted";
}

export function dueLabel(dueAt: Date): string {
  const today = startOfToday();
  const days = Math.round((dueAt.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days < 0) return `${-days} days overdue`;
  return dueAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
