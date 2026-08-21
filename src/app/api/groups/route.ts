import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";

const GroupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  courseId: z.string().min(1),
  teacherId: z.string().optional().or(z.literal("")),
  schedule: z.string().trim().max(120).optional().or(z.literal("")),
}).strict();

export async function POST(req: NextRequest) {
  const gate = await requireCapability("groups.manage");
  if (gate instanceof NextResponse) return gate;

  const parsed = GroupSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  const d = parsed.data;

  const course = await db.course.findUnique({ where: { id: d.courseId }, select: { id: true } });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 400 });
  if (d.teacherId) {
    const t = await db.user.findFirst({ where: { id: d.teacherId, role: "TEACHER", status: "ACTIVE" } });
    if (!t) return NextResponse.json({ error: "Teacher not found" }, { status: 400 });
  }

  const group = await db.group.create({
    data: { name: d.name, courseId: d.courseId, teacherId: d.teacherId || null, schedule: d.schedule || null },
  });
  return NextResponse.json({ ok: true, id: group.id });
}
