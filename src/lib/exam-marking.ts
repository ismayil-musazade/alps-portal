import type { QuestionType } from "@prisma/client";

export type MarkableQuestion = {
  id: string;
  order: number;
  section: string | null;
  type: QuestionType;
  answer: string;
  points: number;
};

export type QuestionResult = {
  id: string;
  order: number;
  section: string | null;
  given: string | null;
  correct: string;
  isCorrect: boolean;
  points: number;
  earned: number;
};

export type MarkResult = {
  score: number;
  maxScore: number;
  percent: number;
  answered: number;
  sectionScores: Record<string, { score: number; max: number }>;
  questions: QuestionResult[];
};

/** "0,2" and "2,0" are the same set of choices. */
function sameChoiceSet(a: string, b: string) {
  const norm = (v: string) => v.split(",").map((x) => x.trim()).filter(Boolean).sort().join(",");
  return norm(a) === norm(b);
}

/**
 * Short text is compared leniently: case, surrounding space and repeated
 * inner spaces are ignored, because a candidate typing "  Blue " has not got
 * it wrong. Several acceptable spellings are separated with a pipe in the key.
 */
function textMatches(given: string, key: string) {
  const norm = (v: string) => v.trim().toLowerCase().replace(/\s+/g, " ");
  return key.split("|").some((accepted) => norm(accepted) === norm(given));
}

export function markAnswer(question: MarkableQuestion, given: string | null): boolean {
  if (given === null || given === "") return false;
  switch (question.type) {
    case "SINGLE_CHOICE":
      return given.trim() === question.answer.trim();
    case "MULTI_CHOICE":
      return sameChoiceSet(given, question.answer);
    case "SHORT_TEXT":
      return textMatches(given, question.answer);
    default:
      return false;
  }
}

/**
 * Mark a whole paper. Unanswered questions score zero rather than being
 * skipped, so the total always reflects the paper the candidate was given.
 */
export function markPaper(
  questions: MarkableQuestion[],
  answers: Record<string, string>,
): MarkResult {
  const results: QuestionResult[] = [];
  const sections: Record<string, { score: number; max: number }> = {};
  let score = 0;
  let maxScore = 0;
  let answered = 0;

  for (const q of questions) {
    const given = answers[q.id] ?? null;
    const isCorrect = markAnswer(q, given);
    const earned = isCorrect ? q.points : 0;

    if (given !== null && given !== "") answered += 1;
    score += earned;
    maxScore += q.points;

    const key = q.section ?? "Overall";
    sections[key] ??= { score: 0, max: 0 };
    sections[key].score += earned;
    sections[key].max += q.points;

    results.push({
      id: q.id,
      order: q.order,
      section: q.section,
      given,
      correct: q.answer,
      isCorrect,
      points: q.points,
      earned,
    });
  }

  return {
    score,
    maxScore,
    percent: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
    answered,
    sectionScores: sections,
    questions: results,
  };
}

/** A, B, C, D … for a stored option index. */
export function optionLetter(index: number) {
  return String.fromCharCode(65 + index);
}

/** Turn a stored answer ("0" or "0,2") into letters for display. */
export function answerLabel(value: string | null, type: QuestionType) {
  if (value === null || value === "") return "—";
  if (type === "SHORT_TEXT") return value;
  return value
    .split(",")
    .map((i) => optionLetter(Number(i)))
    .join(", ");
}
