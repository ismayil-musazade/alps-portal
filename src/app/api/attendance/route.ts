import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";

const AttendanceSchema = z.object({
  groupId: z.string().min(1),
  lessonDate: z.string().min(8), // yyyy-mm-dd
  records: z.array(z.object({
    studentId: z.string().min(1),
    status: z.enum(["PRESENT", "ABSENT", "LATE"]),
    note: z.string().trim().max(200).optional().or(z.literal("")),
  })).min(1).max(100),
}).strict();

/** Bulk upsert one lesson's attendance. Teachers may mark only their own groups. */
export async function POST(req: NextRequest) {
  const gate = await requireCapability("attendance.mark");
  if (gate instanceof NextResponse) return gate;

  const parsed = AttendanceSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  const d = parsed.data;

  const group = await db.group.findUnique({
    where: { id: d.groupId },
    include: { enrollments: { where: { status: "ACTIVE" }, select: { studentId: true } } },
  });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  if (gate.role === "TEACHER" && group.teacherId !== gate.id) {
    return NextResponse.json({ error: "Not your group" }, { status: 403 });
  }

  // only students actually enrolled in this group can be marked
  const enrolled = new Set(group.enrollments.map((e) => e.studentId));
  const invalid = d.records.filter((r) => !enrolled.has(r.studentId));
  if (invalid.length) {
    return NextResponse.json({ error: "Some students are not in this group" }, { status: 400 });
  }

  const lessonDate = new Date(d.lessonDate);
  await db.$transaction(
    d.records.map((r) =>
      db.attendance.upsert({
        where: { studentId_groupId_lessonDate: { studentId: r.studentId, groupId: d.groupId, lessonDate } },
        update: { status: r.status, note: r.note || null, markedById: gate.id },
        create: {
          studentId: r.studentId, groupId: d.groupId, lessonDate,
          status: r.status, note: r.note || null, markedById: gate.id,
        },
      })
    )
  );
  return NextResponse.json({ ok: true, saved: d.records.length });
}
