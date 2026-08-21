import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { canAccessStudent } from "@/lib/scope";

const SkillSchema = z.object({
  courseType: z.enum(["IELTS","SAT","GENERAL_ENGLISH","OTHER"]),
  skill: z.string().trim().min(2).max(80),
  status: z.enum(["NOT_STARTED","LEARNING","NEEDS_IMPROVEMENT","GOOD","MASTERED"]),
}).strict();

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("academics.edit");
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  if (!(await canAccessStudent(gate, id))) {
    return NextResponse.json({ error: "Not allowed for this student" }, { status: 403 });
  }

  const parsed = SkillSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  const d = parsed.data;

  await db.studentSkillStatus.upsert({
    where: { studentId_skill: { studentId: id, skill: d.skill } },
    update: { status: d.status },
    create: { studentId: id, courseType: d.courseType, skill: d.skill, status: d.status },
  });
  return NextResponse.json({ ok: true });
}
