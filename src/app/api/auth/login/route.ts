import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

const LoginSchema = z.object({
  identifier: z.string().trim().min(3).max(120), // email or phone
  password: z.string().min(1).max(200),
});

const WINDOW_MIN = 15;
const MAX_FAILURES = 5;

export async function POST(req: NextRequest) {
  const parsed = LoginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { identifier, password } = parsed.data;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

  // rate limit: max 5 failed attempts per identifier per 15 min
  const since = new Date(Date.now() - WINDOW_MIN * 60_000);
  const failures = await db.loginAttempt.count({
    where: { identifier, success: false, createdAt: { gte: since } },
  });
  if (failures >= MAX_FAILURES) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in 15 minutes." },
      { status: 429 }
    );
  }

  const user = await db.user.findFirst({
    where: {
      status: "ACTIVE",
      OR: [{ email: identifier.toLowerCase() }, { phone: identifier }],
    },
  });

  // constant-shaped flow: always run a bcrypt compare so timing doesn't
  // reveal whether the account exists
  const ok = await bcrypt.compare(
    password,
    user?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv"
  );

  await db.loginAttempt.create({
    data: { identifier, userId: user?.id, success: Boolean(user && ok), ip },
  });

  if (!user || !ok) {
    return NextResponse.json({ error: "Wrong login or password." }, { status: 401 });
  }

  const session = await getSession();
  session.userId = user.id;
  session.role = user.role;
  session.name = user.name;
  session.mustChangePassword = user.mustChangePassword;
  await session.save();

  return NextResponse.json({ ok: true, role: user.role, mustChangePassword: user.mustChangePassword });
}
