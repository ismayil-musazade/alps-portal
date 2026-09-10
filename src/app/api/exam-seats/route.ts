import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { SEAT_NUMBERS, seatLogin, seatName, seatPassword } from "@/lib/exam-seats";

/**
 * Create whichever of the five desks do not exist yet.
 *
 * Safe to run more than once: existing seats are left alone, because wiping
 * their passwords would strand anyone mid-exam. Passwords come back once and
 * are not stored anywhere in readable form.
 */
export async function POST() {
  const gate = await requireCapability("tests.manage");
  if (gate instanceof NextResponse) return gate;

  const existing = await db.examSeat.findMany({ select: { seatNo: true } });
  const have = new Set(existing.map((s) => s.seatNo));
  const missing = SEAT_NUMBERS.filter((n) => !have.has(n));

  const created: { seatNo: number; login: string; password: string }[] = [];

  for (const seatNo of missing) {
    const password = seatPassword();
    const login = seatLogin(seatNo);

    await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: seatName(seatNo),
          email: login,
          passwordHash: await bcrypt.hash(password, 12),
          role: "EXAM_SEAT",
          // a shared desk cannot be asked to choose its own password
          mustChangePassword: false,
        },
      });
      await tx.examSeat.create({
        data: { seatNo, label: seatName(seatNo), userId: user.id },
      });
    });

    created.push({ seatNo, login, password });
  }

  return NextResponse.json({ ok: true, created });
}
