import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { LeadUpdateSchema, emptyToNull } from "@/lib/schemas";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("leads.edit");
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const existing = await db.lead.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = LeadUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = emptyToNull(parsed.data) as Record<string, string | null>;

  const data: Record<string, unknown> = { ...d };
  if ("nextFollowUpAt" in d) data.nextFollowUpAt = d.nextFollowUpAt ? new Date(d.nextFollowUpAt) : null;
  // converted leads are managed through the conversion flow, not edits
  if (existing.status === "CONVERTED") {
    return NextResponse.json({ error: "Lead already converted" }, { status: 409 });
  }
  // first real contact stamps firstContactAt
  if (d.status && d.status !== "NEW" && !existing.firstContactAt) {
    data.firstContactAt = new Date();
  }

  const lead = await db.lead.update({ where: { id }, data: data as never });

  if (d.status && d.status !== existing.status) {
    await db.leadActivity.create({
      data: {
        leadId: id, authorId: gate.id, type: "STATUS_CHANGE",
        body: `Status: ${existing.status.replaceAll("_", " ").toLowerCase()} → ${lead.status.replaceAll("_", " ").toLowerCase()}${d.lostReason ? ` (${d.lostReason})` : ""}`,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
