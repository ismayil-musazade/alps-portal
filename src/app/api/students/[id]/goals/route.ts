import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { canAccessStudent } from "@/lib/scope";

const GoalSchema = z.object({
  courseType: z.enum(["IELTS", "SAT", "GENERAL_ENGLISH", "OTHER"]),
  targetOverall: z.string().trim().max(60).optional().or(z.literal("")),
  targetExamDate: z.string().optional().or(z.literal("")),
  subTargets: z.record(z.string(), z.string().max(60)).optional(),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
}).strict();

/** Goals are academic content: manager + assigned teacher only. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("academics.edit");
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  if (!(await canAccessStudent(gate, id))) {
    return NextResponse.json({ error: "Not allowed for this student" }, { status: 403 });
  }

  const parsed = GoalSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;

  // one goal per course type per student — update if exists
  const existing = await db.goal.findFirst({ where: { studentId: id, courseType: d.courseType } });
  const data = {
    targetOverall: d.targetOverall || null,
    targetExamDate: d.targetExamDate ? new Date(d.targetExamDate) : null,
    subTargets: d.subTargets ?? undefined,
    notes: d.notes || null,
  };
  if (existing) {
    await db.goal.update({ where: { id: existing.id }, data });
  } else {
    await db.goal.create({ data: { studentId: id, courseType: d.courseType, ...data } });
  }
  return NextResponse.json({ ok: true });
}
