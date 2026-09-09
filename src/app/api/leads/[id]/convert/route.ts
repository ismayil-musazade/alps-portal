import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";

/**
 * Convert a lead into an enrolled student profile (brief §5 step 4).
 * Carries all background data over; runs in one transaction.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("students.edit");
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const lead = await db.lead.findUnique({ where: { id }, include: { studentProfile: true } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (lead.studentProfile) {
    return NextResponse.json({ ok: true, studentId: lead.studentProfile.id, already: true });
  }

  const student = await db.$transaction(async (tx) => {
    const s = await tx.studentProfile.create({
      data: {
        leadId: lead.id,
        fullName: lead.fullName,
        phone: lead.phone,
        parentName: lead.parentName,
        parentPhone: lead.parentPhone,
        dateOfBirth: lead.dateOfBirth,
        school: lead.school,
        gradeLevel: lead.gradeLevel,
        currentLevel: lead.currentLevel,
        status: "WAITING_GROUP",
        startDate: new Date(),
      },
    });
    // the record follows the person: what they achieved as a candidate is still
    // theirs once they are a student
    await tx.achievement.updateMany({
      where: { leadId: lead.id },
      data: { leadId: null, studentId: s.id },
    });
    await tx.lead.update({ where: { id: lead.id }, data: { status: "CONVERTED" } });
    await tx.leadActivity.create({
      data: { leadId: lead.id, authorId: gate.id, type: "STATUS_CHANGE", body: "Converted to student." },
    });
    return s;
  });

  return NextResponse.json({ ok: true, studentId: student.id });
}
