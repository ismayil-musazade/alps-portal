import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/authz";
import { markPaper } from "@/lib/exam-marking";

const Schema = z.object({ answers: z.record(z.string(), z.string()) }).strict();

/**
 * The last nine digits, ignoring everything else.
 *
 * People write the same number as "+994 55 123 45 67", "0551234567" and
 * "055-123-45-67". Comparing the tail of the digits matches all three, and
 * also matches a local number against the same one written with a country
 * code — which is the case that actually turns up at a front desk.
 */
function phoneKey(phone: string) {
  return phone.replace(/\D/g, "").slice(-9);
}

/**
 * Find a lead by phone, normalising the stored side too. Doing this in SQL
 * rather than with `endsWith` is the whole point: the number in the database
 * was typed by a human and almost certainly has spaces in it.
 */
async function findLeadByPhone(key: string) {
  if (key.length < 7) return null;
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Lead"
     WHERE right(regexp_replace(phone, '[^0-9]', '', 'g'), 9) = ${key}
     ORDER BY "createdAt" ASC
     LIMIT 1`;
  return rows[0] ?? null;
}

/**
 * Hand in a placement exam.
 *
 * Marking is server-side, and the result is attached to a CRM record straight
 * away: to the candidate's existing lead if their phone matches one, otherwise
 * to a lead created here. That is the point of doing the exam in the portal —
 * by the time the candidate stands up, they are already in the pipeline with a
 * score against their name, and it follows them if they enrol.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireCapability("tests.take");
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const sitting = await db.testSitting.findFirst({
    where: { id, seat: { userId: gate.id } },
    include: { paper: { select: { id: true, title: true, passScore: true } } },
  });
  if (!sitting) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (sitting.status === "GRADED") {
    return NextResponse.json({ error: "Already handed in" }, { status: 409 });
  }

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const questions = await db.testQuestion.findMany({
    where: { paperId: sitting.paperId },
    orderBy: { order: "asc" },
    select: { id: true, order: true, section: true, type: true, answer: true, points: true },
  });
  const result = markPaper(questions, parsed.data.answers);

  // find the candidate in the CRM, or put them there
  let leadId = sitting.leadId;
  if (!leadId) {
    const key = sitting.candidatePhone ? phoneKey(sitting.candidatePhone) : "";
    const existing = await findLeadByPhone(key);

    leadId = existing?.id
      ?? (await db.lead.create({
        data: {
          fullName: sitting.candidateName,
          phone: sitting.candidatePhone || "—",
          source: "WALK_IN",
          status: "PLACEMENT_DONE",
          interestedCourse: "SAT",
          followUpNote: `Sat ${sitting.paper.title} and scored ${result.score}/${result.maxScore} (${result.percent}%).`,
        },
      })).id;
  }

  await db.$transaction([
    db.testSitting.update({
      where: { id: sitting.id },
      data: {
        answers: parsed.data.answers,
        score: result.score,
        maxScore: result.maxScore,
        sectionScores: result.sectionScores,
        status: "GRADED",
        submittedAt: new Date(),
        leadId,
      },
    }),
    db.leadActivity.create({
      data: {
        leadId,
        authorId: gate.id,
        type: "NOTE",
        body: `Placement: ${sitting.paper.title} — ${result.score}/${result.maxScore} (${result.percent}%). `
          + Object.entries(result.sectionScores).map(([k, v]) => `${k} ${v.score}/${v.max}`).join(", "),
      },
    }),
  ]);

  return NextResponse.json({ ok: true, result });
}
