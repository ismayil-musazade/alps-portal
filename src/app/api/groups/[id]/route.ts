import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";

const GroupUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  teacherId: z.string().optional().or(z.literal("")),
  schedule: z.string().trim().max(120).optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "FINISHED", "PLANNED"]).optional(),
}).strict();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("groups.manage");
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const group = await db.group.findUnique({ where: { id }, select: { id: true } });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = GroupUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  const d = parsed.data;

  if (d.teacherId) {
    const t = await db.user.findFirst({ where: { id: d.teacherId, role: "TEACHER", status: "ACTIVE" } });
    if (!t) return NextResponse.json({ error: "Teacher not found" }, { status: 400 });
  }

  await db.$transaction(async (tx) => {
    await tx.group.update({
      where: { id },
      data: {
        ...(d.name ? { name: d.name } : {}),
        ...("teacherId" in d ? { teacherId: d.teacherId || null } : {}),
        ...("schedule" in d ? { schedule: d.schedule || null } : {}),
        ...(d.status ? { status: d.status } : {}),
      },
    });
    // teacher change propagates to active enrollments in this group
    if ("teacherId" in d) {
      await tx.enrollment.updateMany({
        where: { groupId: id, status: "ACTIVE" },
        data: { teacherId: d.teacherId || null },
      });
    }
  });
  return NextResponse.json({ ok: true });
}
