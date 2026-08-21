import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { canAccessStudent } from "@/lib/scope";

const NoteSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  visibility: z.enum(["MANAGER_ONLY", "STAFF", "TEACHER"]),
}).strict();

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("notes.internal.edit");
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  if (!(await canAccessStudent(gate, id))) {
    return NextResponse.json({ error: "Not allowed for this student" }, { status: 403 });
  }

  const parsed = NoteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  await db.internalNote.create({
    data: { studentId: id, authorId: gate.id, body: parsed.data.body, visibility: parsed.data.visibility },
  });
  return NextResponse.json({ ok: true });
}
