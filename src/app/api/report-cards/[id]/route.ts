import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { canAccessStudent } from "@/lib/scope";
import { studentMetrics } from "@/lib/metrics";

const UpdateSchema = z.object({
  strengths: z.string().trim().max(1000).optional().or(z.literal("")),
  weaknesses: z.string().trim().max(1000).optional().or(z.literal("")),
  nextTarget: z.string().trim().max(1000).optional().or(z.literal("")),
  teacherComment: z.string().trim().max(2000).optional().or(z.literal("")),
  publish: z.boolean().optional(),
  refreshMetrics: z.boolean().optional(),
}).strict();

async function load(id: string) {
  const gate = await requireCapability("reports.edit");
  if (gate instanceof NextResponse) return { gate, card: null };
  const card = await db.reportCard.findUnique({ where: { id }, select: { id: true, studentId: true, publishedAt: true } });
  if (!card) return { gate: NextResponse.json({ error: "Not found" }, { status: 404 }), card: null };
  if (!(await canAccessStudent(gate, card.studentId))) {
    return { gate: NextResponse.json({ error: "Not allowed for this student" }, { status: 403 }), card: null };
  }
  return { gate, card };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { gate, card } = await load(id);
  if (gate instanceof NextResponse) return gate;

  const parsed = UpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  const d = parsed.data;

  const data: Record<string, unknown> = {};
  if ("strengths" in d) data.strengths = d.strengths || null;
  if ("weaknesses" in d) data.weaknesses = d.weaknesses || null;
  if ("nextTarget" in d) data.nextTarget = d.nextTarget || null;
  if ("teacherComment" in d) data.teacherComment = d.teacherComment || null;

  // publishing freezes the metrics snapshot at this moment
  if (d.publish !== undefined) {
    if (d.publish) {
      const m = await studentMetrics(card!.studentId);
      data.metrics = {
        attendancePct: m.attendancePct, absences: m.absences,
        taskCompletionPct: m.taskPct, tasksAssigned: m.tasksAssigned, tasksApproved: m.tasksApproved,
        avgQuality: m.avgQuality,
        placement: m.placement?.totalScore ?? null,
        latestExam: m.latestExam ? `${m.latestExam.examType.toLowerCase()} ${m.latestExam.totalScore}` : null,
        target: m.goal?.targetOverall ?? null,
      };
      data.publishedAt = new Date();
    } else {
      data.publishedAt = null;
    }
  } else if (d.refreshMetrics) {
    const m = await studentMetrics(card!.studentId);
    data.metrics = {
      attendancePct: m.attendancePct, absences: m.absences,
      taskCompletionPct: m.taskPct, tasksAssigned: m.tasksAssigned, tasksApproved: m.tasksApproved,
      avgQuality: m.avgQuality,
      placement: m.placement?.totalScore ?? null,
      latestExam: m.latestExam ? `${m.latestExam.examType.toLowerCase()} ${m.latestExam.totalScore}` : null,
      target: m.goal?.targetOverall ?? null,
    };
  }

  await db.reportCard.update({ where: { id }, data: data as never });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { gate, card } = await load(id);
  if (gate instanceof NextResponse) return gate;
  await db.reportCard.delete({ where: { id: card!.id } });
  return NextResponse.json({ ok: true });
}
