import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";

const EndSchema = z.object({
  status: z.enum(["COMPLETED", "DROPPED"]),
}).strict();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("groups.manage");
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const e = await db.enrollment.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!e) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (e.status !== "ACTIVE") return NextResponse.json({ error: "Enrollment already ended" }, { status: 409 });

  const parsed = EndSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  await db.enrollment.update({
    where: { id },
    data: { status: parsed.data.status, endDate: new Date() },
  });
  return NextResponse.json({ ok: true });
}
