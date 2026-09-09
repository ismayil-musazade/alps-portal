import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { TaskCommentSchema } from "@/lib/schemas";
import { staffTaskFilter } from "@/lib/staff-tasks";

/** Anyone who can open the task can talk on it — that is the point of it. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("stafftasks.own");
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const task = await db.staffTask.findFirst({
    where: { id, ...staffTaskFilter(gate) },
    select: { id: true },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = TaskCommentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const comment = await db.staffTaskComment.create({
    data: { taskId: task.id, authorId: gate.id, body: parsed.data.body },
  });
  return NextResponse.json({ ok: true, id: comment.id });
}
