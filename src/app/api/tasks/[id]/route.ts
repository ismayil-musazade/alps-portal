import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { canAccessStudent } from "@/lib/scope";

const TeacherUpdateSchema = z.object({
  status: z.enum(["NOT_STARTED","IN_PROGRESS","SUBMITTED","COMPLETED","MISSING","LATE"]).optional(),
  teacherApproved: z.boolean().optional(),
  score: z.number().min(0).max(100).nullable().optional(),
  comment: z.string().trim().max(1000).optional().or(z.literal("")),
  mistakeReviewDone: z.boolean().optional(),
  deadline: z.string().optional().or(z.literal("")),
}).strict();

const StudentSubmitSchema = z.object({ action: z.literal("submit") }).strict();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const task = await db.studentTask.findUnique({
    where: { id },
    include: { student: { select: { id: true, userId: true } } },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);

  // --- student self-submit: the ONLY write a student may perform ---
  if (user.role === "STUDENT") {
    if (task.student.userId !== user.id) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    const parsed = StudentSubmitSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    if (task.status === "COMPLETED") return NextResponse.json({ error: "Task already completed" }, { status: 409 });
    await db.studentTask.update({
      where: { id },
      data: { status: "SUBMITTED", studentSubmittedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  // --- teacher/manager path ---
  if (!can(user.role, "academics.edit")) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  if (!(await canAccessStudent(user, task.student.id))) {
    return NextResponse.json({ error: "Not allowed for this student" }, { status: 403 });
  }

  const parsed = TeacherUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  const d = parsed.data;

  if (d.score != null && d.score > task.scoreMax) {
    return NextResponse.json({ error: `Score cannot exceed ${task.scoreMax}` }, { status: 400 });
  }

  const data: Record<string, unknown> = { updatedById: user.id };
  if (d.status) data.status = d.status;
  if (d.teacherApproved !== undefined) {
    data.teacherApproved = d.teacherApproved;
    if (d.teacherApproved && !d.status) data.status = "COMPLETED";
  }
  if ("score" in d) data.score = d.score;
  if ("comment" in d) data.comment = d.comment || null;
  if (d.mistakeReviewDone !== undefined) data.mistakeReviewDone = d.mistakeReviewDone;
  if ("deadline" in d) data.deadline = d.deadline ? new Date(d.deadline) : null;

  await db.studentTask.update({ where: { id }, data: data as never });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!can(user.role, "academics.edit")) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const { id } = await params;
  const task = await db.studentTask.findUnique({ where: { id }, select: { studentId: true } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canAccessStudent(user, task.studentId))) {
    return NextResponse.json({ error: "Not allowed for this student" }, { status: 403 });
  }

  await db.studentTask.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
