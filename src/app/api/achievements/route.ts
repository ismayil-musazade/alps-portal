import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { can } from "@/lib/permissions";
import { canAccessStudent } from "@/lib/scope";
import { AchievementCreateSchema } from "@/lib/schemas";
import { parseInstant } from "@/lib/time";

/**
 * Record an olympiad result, certificate or prior exam score against a lead or
 * a student. Gated on the internal-notes capability, because that is what this
 * is — background information the centre keeps about a person — and then on
 * record-level access, so a teacher can only write against their own students.
 */
export async function POST(req: NextRequest) {
  const gate = await requireCapability("notes.internal.edit");
  if (gate instanceof NextResponse) return gate;

  const parsed = AchievementCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const d = parsed.data;

  if (!d.leadId === !d.studentId) {
    return NextResponse.json({ error: "Attach this to one lead or one student" }, { status: 400 });
  }

  if (d.leadId) {
    if (!can(gate.role, "leads.edit")) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }
    const lead = await db.lead.findUnique({ where: { id: d.leadId }, select: { id: true } });
    if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (d.studentId) {
    if (!(await canAccessStudent(gate, d.studentId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const achievedOn = d.achievedOn ? parseInstant(d.achievedOn) : null;
  if (d.achievedOn && !achievedOn) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const row = await db.achievement.create({
    data: {
      title: d.title,
      category: d.category,
      result: d.result || null,
      achievedOn,
      note: d.note || null,
      leadId: d.leadId || null,
      studentId: d.studentId || null,
      createdById: gate.id,
    },
  });
  return NextResponse.json({ ok: true, id: row.id });
}
