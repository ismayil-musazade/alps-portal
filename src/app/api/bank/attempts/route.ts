import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { markAnswer } from "@/lib/exam-marking";

const Schema = z.object({
  questionId: z.string().trim().min(1),
  given: z.string().max(500),
  seconds: z.number().int().min(0).max(36_000).optional(),
}).strict();

/**
 * Answer one practice question.
 *
 * Marking happens here rather than in the browser, for the same reason as the
 * exam: the key never leaves the server. The attempt is only recorded when the
 * person answering is the student themselves — a teacher trying a question to
 * see how it reads should not put a wrong answer on somebody's record.
 */
export async function POST(req: NextRequest) {
  const gate = await requireCapability("bank.view");
  if (gate instanceof NextResponse) return gate;

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  const { questionId, given, seconds } = parsed.data;

  const question = await db.bankQuestion.findFirst({
    where: { id: questionId, published: true },
    select: { id: true, type: true, answer: true, explanation: true },
  });
  if (!question) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isCorrect = markAnswer(
    { id: question.id, order: 0, section: null, type: question.type, answer: question.answer, points: 1 },
    given,
  );

  let recorded = false;
  if (gate.role === "STUDENT") {
    const student = await db.studentProfile.findFirst({
      where: { userId: gate.id },
      select: { id: true },
    });
    if (student) {
      await db.bankAttempt.create({
        data: { questionId: question.id, studentId: student.id, given, isCorrect, seconds },
      });
      recorded = true;
    }
  }

  return NextResponse.json({
    ok: true,
    isCorrect,
    correct: question.answer,
    explanation: question.explanation,
    recorded,
  });
}
