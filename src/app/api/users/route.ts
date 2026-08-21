import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";

const UserCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(120).optional().or(z.literal("")),
  phone: z.string().trim().min(7).max(30).optional().or(z.literal("")),
  role: z.enum(["MANAGER", "STAFF", "TEACHER", "STUDENT", "PARENT"]),
  linkStudentId: z.string().optional().or(z.literal("")), // STUDENT: claim profile · PARENT: link child
}).strict();

/** Admin creates all accounts (no self-signup). Returns a one-time temp password. */
export async function POST(req: NextRequest) {
  const gate = await requireCapability("users.manage");
  if (gate instanceof NextResponse) return gate;

  const parsed = UserCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;
  if (!d.email && !d.phone) {
    return NextResponse.json({ error: "Email or phone is required" }, { status: 400 });
  }

  const clash = await db.user.findFirst({
    where: { OR: [...(d.email ? [{ email: d.email.toLowerCase() }] : []), ...(d.phone ? [{ phone: d.phone }] : [])] },
    select: { id: true },
  });
  if (clash) return NextResponse.json({ error: "A user with this email or phone already exists" }, { status: 409 });

  if (d.linkStudentId) {
    const s = await db.studentProfile.findUnique({ where: { id: d.linkStudentId }, select: { id: true, userId: true } });
    if (!s) return NextResponse.json({ error: "Student profile not found" }, { status: 400 });
    if (d.role === "STUDENT" && s.userId) {
      return NextResponse.json({ error: "That student profile already has an account" }, { status: 409 });
    }
  }

  // readable one-time password, e.g. "alps-VW3K-9FQT"
  const tempPassword = "alps-" + crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 4) + "-" + crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 4);
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const user = await db.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        name: d.name,
        email: d.email ? d.email.toLowerCase() : null,
        phone: d.phone || null,
        role: d.role,
        passwordHash,
        mustChangePassword: true,
      },
    });
    if (d.linkStudentId && d.role === "STUDENT") {
      await tx.studentProfile.update({ where: { id: d.linkStudentId }, data: { userId: u.id } });
    }
    if (d.linkStudentId && d.role === "PARENT") {
      await tx.parentLink.create({ data: { parentUserId: u.id, studentId: d.linkStudentId } });
    }
    return u;
  });

  return NextResponse.json({ ok: true, id: user.id, tempPassword });
}
