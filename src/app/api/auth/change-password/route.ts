import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { currentUser, getSession } from "@/lib/session";

const Schema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8, "At least 8 characters").max(200),
}).strict();

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
  }
  const { currentPassword, newPassword } = parsed.data;

  if (newPassword === currentPassword) {
    return NextResponse.json({ error: "New password must be different" }, { status: 400 });
  }

  const record = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ok = await bcrypt.compare(currentPassword, record.passwordHash);
  if (!ok) return NextResponse.json({ error: "Current password is wrong" }, { status: 401 });

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 12), mustChangePassword: false },
  });

  const session = await getSession();
  session.mustChangePassword = false;
  await session.save();

  return NextResponse.json({ ok: true });
}
