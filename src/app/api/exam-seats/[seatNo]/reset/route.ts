import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { seatPassword, seatLogin } from "@/lib/exam-seats";

/** Give one desk a new password — for when the old one has been passed around. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ seatNo: string }> }) {
  const gate = await requireCapability("tests.manage");
  if (gate instanceof NextResponse) return gate;

  const { seatNo } = await params;
  const n = Number(seatNo);
  if (!Number.isInteger(n)) return NextResponse.json({ error: "Unknown seat" }, { status: 400 });

  const seat = await db.examSeat.findUnique({ where: { seatNo: n }, select: { userId: true } });
  if (!seat) return NextResponse.json({ error: "Unknown seat" }, { status: 404 });

  const busy = await db.testSitting.count({
    where: { seat: { seatNo: n }, status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
  });
  if (busy > 0) {
    return NextResponse.json(
      { error: "Somebody is sitting an exam at this desk. Finish or cancel it first." },
      { status: 409 },
    );
  }

  const password = seatPassword();
  await db.user.update({
    where: { id: seat.userId },
    data: { passwordHash: await bcrypt.hash(password, 12), mustChangePassword: false },
  });

  return NextResponse.json({ ok: true, login: seatLogin(n), password });
}
