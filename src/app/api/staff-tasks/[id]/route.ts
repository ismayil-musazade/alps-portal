import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { can } from "@/lib/permissions";
import { StaffTaskUpdateSchema } from "@/lib/schemas";
import { parseInstant } from "@/lib/time";
import { syncStaffTaskReminder, DEFAULT_REMINDER_HOUR } from "@/lib/reminders";
import { allowedStatuses, staffTaskFilter } from "@/lib/staff-tasks";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("stafftasks.own");
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const task = await db.staffTask.findFirst({
    where: { id, ...staffTaskFilter(gate) },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = StaffTaskUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const d = parsed.data;
  const isManager = can(gate.role, "stafftasks.assign");
  const data: Record<string, unknown> = {};

  // only the manager may reword, reassign or re-deadline a task
  if (isManager) {
    if (d.title !== undefined) data.title = d.title;
    if (d.description !== undefined) data.description = d.description || null;
    if (d.managerNote !== undefined) data.managerNote = d.managerNote || null;
    if (d.assignedToId !== undefined) {
      const assignee = await db.user.findFirst({
        where: { id: d.assignedToId, status: "ACTIVE", role: { in: ["MANAGER", "STAFF", "TEACHER"] } },
        select: { id: true },
      });
      if (!assignee) return NextResponse.json({ error: "Unknown assignee" }, { status: 400 });
      data.assignedToId = d.assignedToId;
    }
    if (d.dueAt !== undefined) {
      if (!d.dueAt) data.dueAt = null;
      else {
        const due = parseInstant(d.dueAt, DEFAULT_REMINDER_HOUR);
        if (!due) return NextResponse.json({ error: "Invalid deadline" }, { status: 400 });
        data.dueAt = due;
      }
    }
  } else if (d.title !== undefined || d.assignedToId !== undefined || d.dueAt !== undefined || d.managerNote !== undefined) {
    return NextResponse.json({ error: "Only a manager can change that" }, { status: 403 });
  }

  if (d.status !== undefined) {
    if (!allowedStatuses(gate, task.assignedToId).includes(d.status)) {
      return NextResponse.json({ error: "Not allowed to set that status" }, { status: 403 });
    }
    data.status = d.status;
    data.completedAt = d.status === "APPROVED" ? new Date() : null;
  }

  const updated = await db.staffTask.update({ where: { id }, data });

  // the deadline, the owner and "is it finished" all move the bell with them
  await syncStaffTaskReminder(updated, gate.id);

  return NextResponse.json({ ok: true });
}

/** Manager deletes a task; its uploaded files go with it. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("stafftasks.assign");
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const task = await db.staffTask.findUnique({
    where: { id },
    include: { files: { select: { url: true } } },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (task.files.length) {
    // storage is outside the database, so it will not cascade on its own
    await del(task.files.map((f) => f.url)).catch(() => {});
  }
  await db.staffTask.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
