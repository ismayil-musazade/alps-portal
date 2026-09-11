import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";

const Schema = z.object({
  paperId: z.string().trim().min(1),
  candidateName: z.string().trim().min(2).max(120),
  candidatePhone: z.string().trim().max(30).optional().or(z.literal("")),
}).strict();

/**
 * Start a sitting at this desk.
 *
 * The candidate types their own name here. Whether that stays the way in, or
 * becomes a link the front desk hands out, is still undecided — but either way
 * the name belongs to the sitting rather than the desk, so nothing about this
 * record has to change when that is settled.
 */
export async function POST(req: NextRequest) {
  const gate = await requireCapability("tests.take");
  if (gate instanceof NextResponse) return gate;

  const seat = await db.examSeat.findFirst({ where: { userId: gate.id }, select: { id: true } });
  if (!seat) return NextResponse.json({ error: "This is not an exam desk" }, { status: 403 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Type the candidate's full name to start." },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const busy = await db.testSitting.count({
    where: { seatId: seat.id, status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
  });
  if (busy > 0) {
    return NextResponse.json(
      { error: "There is already an exam open at this desk." },
      { status: 409 },
    );
  }

  const paper = await db.testPaper.findFirst({
    where: { id: d.paperId, status: "PUBLISHED" },
    select: { id: true, durationMin: true },
  });
  if (!paper) return NextResponse.json({ error: "That paper is not available" }, { status: 404 });

  const sitting = await db.testSitting.create({
    data: {
      paperId: paper.id,
      seatId: seat.id,
      candidateName: d.candidateName,
      candidatePhone: d.candidatePhone || null,
      status: "ASSIGNED",
      expiresAt: new Date(Date.now() + paper.durationMin * 60_000 + 15 * 60_000),
    },
  });
  return NextResponse.json({ ok: true, id: sitting.id });
}
