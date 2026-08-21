import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { ActivityCreateSchema } from "@/lib/schemas";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("leads.edit");
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const lead = await db.lead.findUnique({ where: { id }, select: { id: true } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = ActivityCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  await db.leadActivity.create({
    data: { leadId: id, authorId: gate.id, type: parsed.data.type, body: parsed.data.body },
  });

  return NextResponse.json({ ok: true });
}
