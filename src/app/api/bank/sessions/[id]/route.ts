import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";

const Schema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  objective: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
  published: z.boolean().optional(),
  move: z.enum(["up", "down"]).optional(),
}).strict();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("bank.manage");
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const session = await db.bankSession.findUnique({ where: { id } });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  const d = parsed.data;

  // reordering swaps with the neighbour, so the numbering stays 1..n with no gaps
  if (d.move) {
    const neighbour = await db.bankSession.findFirst({
      where: {
        skillId: session.skillId,
        order: d.move === "up" ? { lt: session.order } : { gt: session.order },
      },
      orderBy: { order: d.move === "up" ? "desc" : "asc" },
    });
    if (neighbour) {
      await db.$transaction([
        // park it out of the way: (skillId, order) is unique
        db.bankSession.update({ where: { id: session.id }, data: { order: -1 } }),
        db.bankSession.update({ where: { id: neighbour.id }, data: { order: session.order } }),
        db.bankSession.update({ where: { id: session.id }, data: { order: neighbour.order } }),
      ]);
    }
    return NextResponse.json({ ok: true });
  }

  const data: Record<string, unknown> = {};
  if (d.title !== undefined) data.title = d.title;
  if (d.objective !== undefined) data.objective = d.objective || null;
  if (d.notes !== undefined) data.notes = d.notes || null;
  if (d.published !== undefined) data.published = d.published;

  await db.bankSession.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("bank.manage");
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const session = await db.bankSession.findUnique({
    where: { id },
    include: { _count: { select: { questions: true } } },
  });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session._count.questions > 0) {
    return NextResponse.json(
      { error: `This session has ${session._count.questions} questions. Move them first.` },
      { status: 409 },
    );
  }

  await db.bankSession.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
