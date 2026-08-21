import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { canAccessStudent } from "@/lib/scope";

const AssignSchema = z.union([
  z.object({ templateIds: z.array(z.string().min(1)).min(1).max(100) }).strict(),
  z.object({
    title: z.string().trim().min(2).max(160),
    category: z.enum(["PRACTICE_TEST","VOCAB_LIST","READING_ARTICLE","HOMEWORK","WRITING_TASK","SPEAKING_TASK","SKILL_CHECKLIST","EXAM_REVIEW"]),
    courseType: z.enum(["IELTS","SAT","GENERAL_ENGLISH","OTHER"]),
    deadline: z.string().optional().or(z.literal("")),
  }).strict(),
]);

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("academics.edit");
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  if (!(await canAccessStudent(gate, id))) {
    return NextResponse.json({ error: "Not allowed for this student" }, { status: 403 });
  }
  const student = await db.studentProfile.findUnique({ where: { id }, select: { id: true } });
  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = AssignSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  if ("templateIds" in parsed.data) {
    const templates = await db.taskTemplate.findMany({ where: { id: { in: parsed.data.templateIds } } });
    if (!templates.length) return NextResponse.json({ error: "No templates found" }, { status: 400 });
    // skip templates already assigned to this student
    const existing = await db.studentTask.findMany({
      where: { studentId: id, templateId: { in: templates.map((t) => t.id) } },
      select: { templateId: true },
    });
    const skip = new Set(existing.map((e) => e.templateId));
    const fresh = templates.filter((t) => !skip.has(t.id));
    await db.studentTask.createMany({
      data: fresh.map((t) => ({
        studentId: id, templateId: t.id, title: t.title, category: t.category,
        courseType: t.courseType, updatedById: gate.id,
      })),
    });
    return NextResponse.json({ ok: true, created: fresh.length, skipped: templates.length - fresh.length });
  }

  const d = parsed.data;
  await db.studentTask.create({
    data: {
      studentId: id, title: d.title, category: d.category, courseType: d.courseType,
      deadline: d.deadline ? new Date(d.deadline) : null, updatedById: gate.id,
    },
  });
  return NextResponse.json({ ok: true, created: 1 });
}
