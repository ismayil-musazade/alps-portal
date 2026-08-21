import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";

const UserUpdateSchema = z.object({
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
  resetPassword: z.boolean().optional(),
}).strict();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("users.manage");
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  if (id === gate.id) return NextResponse.json({ error: "You cannot modify your own account here" }, { status: 400 });

  const user = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = UserUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  let tempPassword: string | undefined;
  const data: Record<string, unknown> = {};
  if (parsed.data.status) data.status = parsed.data.status;
  if (parsed.data.resetPassword) {
    tempPassword = "alps-" + crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 4) + "-" + crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 4);
    data.passwordHash = await bcrypt.hash(tempPassword, 12);
    data.mustChangePassword = true;
  }

  await db.user.update({ where: { id }, data: data as never });
  return NextResponse.json({ ok: true, ...(tempPassword ? { tempPassword } : {}) });
}
