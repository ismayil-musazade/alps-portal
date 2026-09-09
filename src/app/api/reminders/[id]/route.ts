import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { ReminderUpdateSchema } from "@/lib/schemas";
import { parseInstant } from "@/lib/time";

/** You may touch a reminder only if it is on your bell or you created it. */
async function ownedBy(userId: string, id: string) {
  return db.reminder.findFirst({
    where: { id, OR: [{ assignedToId: userId }, { createdById: userId }] },
    select: { id: true },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("reminders.use");
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  if (!(await ownedBy(gate.id, id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = ReminderUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const data: Record<string, unknown> = {};
  if (d.title !== undefined) data.title = d.title;
  if (d.body !== undefined) data.body = d.body || null;
  if (d.dueAt !== undefined) {
    const due = parseInstant(d.dueAt);
    if (!due) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    data.dueAt = due;
  }
  if (d.status !== undefined) {
    data.status = d.status;
    data.completedAt = d.status === "OPEN" ? null : new Date();
  }

  await db.reminder.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("reminders.use");
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  if (!(await ownedBy(gate.id, id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await db.reminder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
