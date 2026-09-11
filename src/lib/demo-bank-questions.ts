import { db } from "@/lib/db";
import { QUESTIONS as PAPER_QUESTIONS } from "@/lib/demo-placement-paper";

/**
 * Put the five sample questions into the skill tree, so the Question Bank has
 * something working in it before the real bank arrives.
 *
 * They are the same five as the demo placement paper — three that ask which
 * finding supports a conclusion (Command of Evidence) and two that ask what
 * most logically completes a text (Inferences) — which is exactly how the SAT
 * classifies them, so they land in the right place rather than a bucket.
 */
const PLACEMENT: { skillSlug: string; session: string; objective: string; take: number[] }[] = [
  {
    skillSlug: "command-of-evidence",
    session: "Which finding supports the conclusion?",
    objective: "Pick the result that would actually strengthen a researcher's claim, not one that merely sounds relevant.",
    take: [0, 1, 2],
  },
  {
    skillSlug: "inferences",
    session: "Completing the text",
    objective: "Finish a passage with the conclusion its evidence points to, without adding anything new.",
    take: [3, 4],
  },
];

export async function installDemoBankQuestions() {
  let added = 0;
  let sessions = 0;

  for (const group of PLACEMENT) {
    const skill = await db.bankSkill.findFirst({
      where: { slug: group.skillSlug },
      select: { id: true },
    });
    if (!skill) continue;

    let session = await db.bankSession.findFirst({
      where: { skillId: skill.id, title: group.session },
      select: { id: true },
    });
    if (!session) {
      const last = await db.bankSession.findFirst({
        where: { skillId: skill.id },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      session = await db.bankSession.create({
        data: {
          skillId: skill.id,
          order: (last?.order ?? 0) + 1,
          title: group.session,
          objective: group.objective,
        },
        select: { id: true },
      });
      sessions += 1;
    }

    for (const [i, index] of group.take.entries()) {
      const q = PAPER_QUESTIONS[index];
      const exists = await db.bankQuestion.findFirst({
        where: { skillId: skill.id, prompt: q.prompt, passage: q.passage },
        select: { id: true },
      });
      if (exists) continue;

      await db.bankQuestion.create({
        data: {
          skillId: skill.id,
          sessionId: session.id,
          order: i + 1,
          difficulty: "MEDIUM",
          type: "SINGLE_CHOICE",
          passage: q.passage,
          prompt: q.prompt,
          options: q.options,
          answer: q.answer,
          source: "Demo placement paper",
        },
      });
      added += 1;
    }
  }

  return { added, sessions };
}
