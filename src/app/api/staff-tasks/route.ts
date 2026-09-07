import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { StaffTaskCreateSchema } from "@/lib/schemas";

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
    dueAt = new Date(d.dueAt);
    if (Number.isNaN(dueAt.getTime())) {
      return NextResponse.json({ error: "Invalid deadline" }, { status: 400 });
    }
  }

  const task = await db.staffTask.create({
    data: {
      title: d.title,
      description: d.description || null,
      assignedToId: d.assignedToId,
      createdById: gate.id,
      dueAt,
    },
  });
  return NextResponse.json({ ok: true, id: task.id });
}
