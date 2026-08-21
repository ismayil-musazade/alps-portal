import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { canAccessStudent } from "@/lib/scope";
import { studentMetrics } from "@/lib/metrics";

const CreateSchema = z.object({
  period: z.string().trim().regex(/^\d{4}-\d{2}$/, "Use YYYY-MM"),
  strengths: z.string().trim().max(1000).optional().or(z.literal("")),
  weaknesses: z.string().trim().max(1000).optional().or(z.literal("")),
  nextTarget: z.string().trim().max(1000).optional().or(z.literal("")),
  teacherComment: z.string().trim().max(2000).optional().or(z.literal("")),
}).strict();

/** Create a report card DRAFT. Metrics are snapshotted at publish time. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("reports.edit");
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  if (!(await canAccessStudent(gate, id))) {
    return NextResponse.json({ error: "Not allowed for this student" }, { status: 403 });
  }

  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
  }
  const d = parsed.data;

  const clash = await db.reportCard.findFirst({ where: { studentId: id, period: d.period }, select: { id: true } });
  if (clash) return NextResponse.json({ error: `A report card for ${d.period} already exists` }, { status: 409 });

  // live metrics stored on the draft too, so the composer shows real numbers
  const m = await studentMetrics(id);
  const card = await db.reportCard.create({
    data: {
      studentId: id,
      period: d.period,
      metrics: {
        attendancePct: m.attendancePct, absences: m.absences,
        taskCompletionPct: m.taskPct, tasksAssigned: m.tasksAssigned, tasksApproved: m.tasksApproved,
        avgQuality: m.avgQuality,
        placement: m.placement?.totalScore ?? null,
        latestExam: m.latestExam ? `${m.latestExam.examType.toLowerCase()} ${m.latestExam.totalScore}` : null,
        target: m.goal?.targetOverall ?? null,
      },
      strengths: d.strengths || null,
      weaknesses: d.weaknesses || null,
      nextTarget: d.nextTarget || null,
      teacherComment: d.teacherComment || null,
      createdById: gate.id,
    },
  });
  return NextResponse.json({ ok: true, id: card.id });
}
