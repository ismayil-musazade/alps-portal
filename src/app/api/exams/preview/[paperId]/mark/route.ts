import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { markPaper } from "@/lib/exam-marking";

const Schema = z.object({ answers: z.record(z.string(), z.string()) }).strict();

/**
 * Mark a paper without recording anything — the manager walking through the
 * exam to see what a candidate sees. It shares the marking function with a
 * real sitting, so what is shown here is what will be scored later.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ paperId: string }> }) {
  const gate = await requireCapability("tests.manage");
  if (gate instanceof NextResponse) return gate;

  const { paperId } = await params;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const questions = await db.testQuestion.findMany({
    where: { paperId },
    orderBy: { order: "asc" },
    select: { id: true, order: true, section: true, type: true, answer: true, points: true, options: true },
  });
  if (!questions.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = markPaper(questions, parsed.data.answers);
  return NextResponse.json({ ok: true, result });
}
