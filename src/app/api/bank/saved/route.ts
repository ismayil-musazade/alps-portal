import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";

const Schema = z.object({ questionId: z.string().trim().min(1) }).strict();

/** Bookmark a question, or take the bookmark off if it is already there. */
export async function POST(req: NextRequest) {
  const gate = await requireCapability("bank.view");
  if (gate instanceof NextResponse) return gate;

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const student = await db.studentProfile.findFirst({
    where: { userId: gate.id },
    select: { id: true },
  });
  if (!student) return NextResponse.json({ error: "Only a student can save questions" }, { status: 403 });

  const existing = await db.bankSaved.findUnique({
    where: { studentId_questionId: { studentId: student.id, questionId: parsed.data.questionId } },
  });

  if (existing) {
    await db.bankSaved.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true, saved: false });
  }

  const question = await db.bankQuestion.findUnique({
    where: { id: parsed.data.questionId },
    select: { id: true },
  });
  if (!question) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.bankSaved.create({ data: { studentId: student.id, questionId: question.id } });
  return NextResponse.json({ ok: true, saved: true });
}
