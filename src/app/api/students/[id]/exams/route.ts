import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { canAccessStudent } from "@/lib/scope";

const ExamSchema = z.object({
  courseType: z.enum(["IELTS", "SAT", "GENERAL_ENGLISH", "OTHER"]),
  examType: z.enum(["PLACEMENT", "PROGRESS", "MOCK", "FINAL"]),
  examDate: z.string().min(8),
  totalScore: z.string().trim().min(1).max(30),
  sectionScores: z.record(z.string(), z.string().max(30)).optional(),
  teacherComment: z.string().trim().max(1000).optional().or(z.literal("")),
  recommendedAction: z.string().trim().max(500).optional().or(z.literal("")),
}).strict();

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("academics.edit");
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  if (!(await canAccessStudent(gate, id))) {
    return NextResponse.json({ error: "Not allowed for this student" }, { status: 403 });
  }
  const student = await db.studentProfile.findUnique({ where: { id }, select: { id: true } });
  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = ExamSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;

  const exam = await db.exam.create({
    data: {
      studentId: id, courseType: d.courseType, examType: d.examType,
      examDate: new Date(d.examDate), totalScore: d.totalScore,
      sectionScores: d.sectionScores && Object.keys(d.sectionScores).length ? d.sectionScores : undefined,
      teacherComment: d.teacherComment || null,
      recommendedAction: d.recommendedAction || null,
      createdById: gate.id,
    },
  });
  return NextResponse.json({ ok: true, id: exam.id });
}
