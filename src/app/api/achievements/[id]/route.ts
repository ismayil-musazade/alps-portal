import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { can } from "@/lib/permissions";
import { canAccessStudent } from "@/lib/scope";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("notes.internal.edit");
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const row = await db.achievement.findUnique({
    where: { id },
    select: { id: true, leadId: true, studentId: true },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // same reach as writing one: leads for office staff, own students for teachers
  if (row.leadId && !can(gate.role, "leads.edit")) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  if (row.studentId && !(await canAccessStudent(gate, row.studentId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.achievement.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
