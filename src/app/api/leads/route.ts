import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { LeadCreateSchema, emptyToNull } from "@/lib/schemas";
import { parseInstant } from "@/lib/time";
import { syncLeadFollowUpReminder, DEFAULT_REMINDER_HOUR } from "@/lib/reminders";

export async function POST(req: NextRequest) {
  const gate = await requireCapability("leads.edit");
  if (gate instanceof NextResponse) return gate;

  const parsed = LeadCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = emptyToNull(parsed.data) as Record<string, string | null>;

  const lead = await db.lead.create({
    data: {
      fullName: d.fullName as string,
      phone: d.phone as string,
      parentName: d.parentName,
      parentPhone: d.parentPhone,
      school: d.school,
      gradeLevel: d.gradeLevel,
      source: (d.source ?? "OTHER") as never,
      interestedCourse: (d.interestedCourse ?? null) as never,
      currentLevel: d.currentLevel,
      targetScore: d.targetScore,
      preferredSchedule: d.preferredSchedule,
      groupPreference: d.groupPreference,
      responsibleStaffId: d.responsibleStaffId,
      nextFollowUpAt: d.nextFollowUpAt ? parseInstant(d.nextFollowUpAt, DEFAULT_REMINDER_HOUR) : null,
      lastContactNote: d.lastContactNote,
      followUpNote: d.followUpNote,
    },
  });

  await db.leadActivity.create({
    data: { leadId: lead.id, authorId: gate.id, type: "NOTE", body: "Lead created." },
  });

  await syncLeadFollowUpReminder({
    leadId: lead.id,
    leadName: lead.fullName,
    dueAt: lead.nextFollowUpAt,
    note: lead.followUpNote,
    ownerId: lead.responsibleStaffId ?? gate.id,
    actorId: gate.id,
    reopen: true,
  });

  return NextResponse.json({ ok: true, id: lead.id });
}
