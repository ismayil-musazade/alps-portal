import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { StaffTaskCreateSchema } from "@/lib/schemas";
import { parseInstant } from "@/lib/time";
import { syncStaffTaskReminder, DEFAULT_REMINDER_HOUR } from "@/lib/reminders";

/** Manager assigns a task to a member of staff. */
export async function POST(req: NextRequest) {
  const gate = await requireCapability("stafftasks.assign");
  if (gate instanceof NextResponse) return gate;

  const parsed = StaffTaskCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const assignee = await db.user.findFirst({
    where: { id: d.assignedToId, status: "ACTIVE", role: { in: ["MANAGER", "STAFF", "TEACHER"] } },
    select: { id: true },
  });
  if (!assignee) return NextResponse.json({ error: "Unknown assignee" }, { status: 400 });

  let dueAt: Date | null = null;
  if (d.dueAt) {
    dueAt = parseInstant(d.dueAt, DEFAULT_REMINDER_HOUR);
    if (!dueAt) return NextResponse.json({ error: "Invalid deadline" }, { status: 400 });
  }

  // a follow-up task hangs off the one it came out of
  if (d.parentTaskId) {
    const parent = await db.staffTask.findUnique({
      where: { id: d.parentTaskId },
      select: { id: true },
    });
    if (!parent) return NextResponse.json({ error: "Unknown parent task" }, { status: 400 });
  }

  const task = await db.staffTask.create({
    data: {
      title: d.title,
      description: d.description || null,
      assignedToId: d.assignedToId,
      createdById: gate.id,
      parentTaskId: d.parentTaskId || null,
      dueAt,
    },
  });

  await syncStaffTaskReminder(task, gate.id);

  return NextResponse.json({ ok: true, id: task.id });
}
