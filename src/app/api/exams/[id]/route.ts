import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { canAccessStudent } from "@/lib/scope";

const ExamUpdateSchema = z.object({
  totalScore: z.string().trim().min(1).max(30).optional(),
  sectionScores: z.record(z.string(), z.string().max(30)).optional(),
  teacherComment: z.string().trim().max(1000).optional().or(z.literal("")),
  recommendedAction: z.string().trim().max(500).optional().or(z.literal("")),
  examDate: z.string().optional(),
}).strict();

async function gateExam(id: string) {
  const gate = await requireCapability("academics.edit");
  if (gate instanceof NextResponse) return { gate, exam: null };
  const exam = await db.exam.findUnique({ where: { id }, select: { id: true, studentId: true } });
  if (!exam) return { gate: NextResponse.json({ error: "Not found" }, { status: 404 }), exam: null };
  if (!(await canAccessStudent(gate, exam.studentId))) {
    return { gate: NextResponse.json({ error: "Not allowed for this student" }, { status: 403 }), exam: null };
  }
  return { gate, exam };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { gate, exam } = await gateExam(id);
  if (gate instanceof NextResponse) return gate;

  const parsed = ExamUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  const d = parsed.data;

  await db.exam.update({
    where: { id: exam!.id },
    data: {
      ...(d.totalScore ? { totalScore: d.totalScore } : {}),
      ...(d.sectionScores ? { sectionScores: d.sectionScores } : {}),
      ...("teacherComment" in d ? { teacherComment: d.teacherComment || null } : {}),
      ...("recommendedAction" in d ? { recommendedAction: d.recommendedAction || null } : {}),
      ...(d.examDate ? { examDate: new Date(d.examDate) } : {}),
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { gate, exam } = await gateExam(id);
  if (gate instanceof NextResponse) return gate;
  await db.exam.delete({ where: { id: exam!.id } });
  return NextResponse.json({ ok: true });
}
