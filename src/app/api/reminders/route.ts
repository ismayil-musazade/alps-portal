import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { can } from "@/lib/permissions";
import { ReminderCreateSchema } from "@/lib/schemas";
import { parseInstant } from "@/lib/time";

/** Create a reminder. Non-managers may only create reminders for themselves. */
export async function POST(req: NextRequest) {
  const gate = await requireCapability("reminders.use");
  if (gate instanceof NextResponse) return gate;

  const parsed = ReminderCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const d = parsed.data;

  // only a manager may put a reminder on somebody else's bell
  const assignedToId =
    d.assignedToId && can(gate.role, "reminders.assign.others") ? d.assignedToId : gate.id;

  if (assignedToId !== gate.id) {
    const target = await db.user.findFirst({
      where: { id: assignedToId, status: "ACTIVE", role: { in: ["MANAGER", "STAFF", "TEACHER"] } },
      select: { id: true },
    });
    if (!target) return NextResponse.json({ error: "Unknown assignee" }, { status: 400 });
  }

  const due = parseInstant(d.dueAt);
  if (!due) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  const reminder = await db.reminder.create({
    data: {
      title: d.title,
      body: d.body || null,
      dueAt: due,
      assignedToId,
      createdById: gate.id,
      leadId: d.leadId || null,
      studentId: d.studentId || null,
    },
  });
  return NextResponse.json({ ok: true, id: reminder.id });
}

/** The caller's own bell: open reminders, soonest first. */
export async function GET() {
  const gate = await requireCapability("reminders.use");
  if (gate instanceof NextResponse) return gate;

  const reminders = await db.reminder.findMany({
    where: { assignedToId: gate.id, status: "OPEN" },
    orderBy: { dueAt: "asc" },
    take: 50,
    include: {
      lead: { select: { id: true, fullName: true } },
      student: { select: { id: true, fullName: true } },
    },
  });
  return NextResponse.json({ reminders });
}
