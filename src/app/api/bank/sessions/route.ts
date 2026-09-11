import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";

const Schema = z.object({
  skillId: z.string().trim().min(1),
  title: z.string().trim().min(2).max(160),
  objective: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
}).strict();

/** Add a session to a skill. It goes on the end of whatever is already there. */
export async function POST(req: NextRequest) {
  const gate = await requireCapability("bank.manage");
  if (gate instanceof NextResponse) return gate;

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const skill = await db.bankSkill.findUnique({ where: { id: d.skillId }, select: { id: true } });
  if (!skill) return NextResponse.json({ error: "Unknown skill" }, { status: 400 });

  const last = await db.bankSession.findFirst({
    where: { skillId: skill.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const session = await db.bankSession.create({
    data: {
      skillId: skill.id,
      order: (last?.order ?? 0) + 1,
      title: d.title,
      objective: d.objective || null,
      notes: d.notes || null,
    },
  });
  return NextResponse.json({ ok: true, id: session.id });
}
