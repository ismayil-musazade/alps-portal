import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";

const EnrollSchema = z.object({
  studentId: z.string().min(1),
  groupId: z.string().min(1),
}).strict();

/** Enroll a student into a group (course + teacher derive from the group). */
export async function POST(req: NextRequest) {
  const gate = await requireCapability("groups.manage");
  if (gate instanceof NextResponse) return gate;

  const parsed = EnrollSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  const { studentId, groupId } = parsed.data;

  const [student, group] = await Promise.all([
    db.studentProfile.findUnique({ where: { id: studentId }, select: { id: true, status: true } }),
    db.group.findUnique({ where: { id: groupId }, select: { id: true, courseId: true, teacherId: true, status: true } }),
  ]);
  if (!student || !group) return NextResponse.json({ error: "Student or group not found" }, { status: 400 });
  if (group.status === "FINISHED") return NextResponse.json({ error: "Group is finished" }, { status: 400 });

  const dup = await db.enrollment.findFirst({ where: { studentId, groupId, status: "ACTIVE" } });
  if (dup) return NextResponse.json({ error: "Already enrolled in this group" }, { status: 409 });

  await db.$transaction(async (tx) => {
    await tx.enrollment.create({
      data: { studentId, courseId: group.courseId, groupId, teacherId: group.teacherId },
    });
    if (student.status === "WAITING_GROUP") {
      await tx.studentProfile.update({ where: { id: studentId }, data: { status: "ACTIVE" } });
    }
  });
  return NextResponse.json({ ok: true });
}
