import { db } from "@/lib/db";

/** Colleagues you may write to — students and parents are out of scope. */
export const STAFF_ROLES = ["MANAGER", "STAFF", "TEACHER"] as const;

/** The number on the envelope in the header. */
export async function unreadMessageCount(userId: string) {
  return db.message.count({ where: { recipientId: userId, readAt: null } });
}

export type Thread = {
  userId: string;
  name: string;
  role: string;
  lastBody: string;
  lastAt: Date;
  outgoing: boolean;
  unread: number;
};

/**
 * One row per person you have talked to, newest first.
 *
 * The centre has a handful of staff, so pulling the recent messages and
 * folding them in memory is both simpler and faster than a window function.
 */
export async function listThreads(userId: string): Promise<Thread[]> {
  const rows = await db.message.findMany({
    where: { OR: [{ senderId: userId }, { recipientId: userId }] },
    orderBy: { createdAt: "desc" },
    take: 400,
    include: {
      sender: { select: { id: true, name: true, role: true } },
      recipient: { select: { id: true, name: true, role: true } },
    },
  });

  const threads = new Map<string, Thread>();
  for (const m of rows) {
    const outgoing = m.senderId === userId;
    const other = outgoing ? m.recipient : m.sender;
    const seen = threads.get(other.id);
    if (!seen) {
      threads.set(other.id, {
        userId: other.id,
        name: other.name,
        role: other.role,
        lastBody: m.body,
        lastAt: m.createdAt,
        outgoing,
        unread: !outgoing && !m.readAt ? 1 : 0,
      });
    } else if (!outgoing && !m.readAt) {
      seen.unread += 1;
    }
  }
  return [...threads.values()];
}
