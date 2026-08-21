import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";

const StudentUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  parentName: z.string().trim().max(120).optional().or(z.literal("")),
  parentPhone: z.string().trim().max(30).optional().or(z.literal("")),
  school: z.string().trim().max(160).optional().or(z.literal("")),
  gradeLevel: z.string().trim().max(40).optional().or(z.literal("")),
  currentLevel: z.string().trim().max(60).optional().or(z.literal("")),
  previousScores: z.string().trim().max(1000).optional().or(z.literal("")),
  strengths: z.string().trim().max(1000).optional().or(z.literal("")),
  weaknesses: z.string().trim().max(1000).optional().or(z.literal("")),
  learningNotes: z.string().trim().max(2000).optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "FROZEN", "COMPLETED", "DROPPED", "WAITING_GROUP"]).optional(),
}).strict();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("students.edit");
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const exists = await db.studentProfile.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = StudentUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) data[k] = v === "" ? null : v;

  await db.studentProfile.update({ where: { id }, data: data as never });
  return NextResponse.json({ ok: true });
}
