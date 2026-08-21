import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";

const CourseSchema = z.object({
  name: z.string().trim().min(2).max(80),
  type: z.enum(["IELTS", "SAT", "GENERAL_ENGLISH", "OTHER"]),
  description: z.string().trim().max(400).optional().or(z.literal("")),
}).strict();

export async function POST(req: NextRequest) {
  const gate = await requireCapability("groups.manage");
  if (gate instanceof NextResponse) return gate;

  const parsed = CourseSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const course = await db.course.create({
    data: { name: parsed.data.name, type: parsed.data.type, description: parsed.data.description || null },
  });
  return NextResponse.json({ ok: true, id: course.id });
}
