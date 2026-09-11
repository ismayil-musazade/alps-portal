import { db } from "@/lib/db";
import { startOfToday, CENTRE_TZ } from "@/lib/time";

/** Raw counts for one skill, for one student. */
export type SkillStats = {
  total: number;
  attempted: number;
  attempts: number;
  correct: number;
};

export const EMPTY: SkillStats = { total: 0, attempted: 0, attempts: 0, correct: 0 };

export function accuracy(s: SkillStats): number | null {
  return s.attempts > 0 ? Math.round((s.correct / s.attempts) * 100) : null;
}

export function progressPct(s: SkillStats): number {
  return s.total > 0 ? (s.attempted / s.total) * 100 : 0;
}

/**
 * Every skill's totals in one query.
 *
 * A left join from questions to this student's attempts, rather than a query
 * per skill: with 29 skills and a few thousand questions the per-skill version
 * is 29 round trips to build one screen.
 *
 * Progress counts each question once however many times it has been tried.
 * Accuracy counts every attempt, so re-doing a question you got wrong pulls
 * the percentage back up only when you actually get it right.
 */
export async function statsBySkill(studentId: string | null): Promise<Map<string, SkillStats>> {
  const rows = await db.$queryRaw<
    { skill_id: string; total: bigint; attempted: bigint; attempts: bigint; correct: bigint }[]
  >`
    SELECT q."skillId"                                        AS skill_id,
           COUNT(DISTINCT q.id)                               AS total,
           COUNT(DISTINCT a."questionId")                     AS attempted,
           COUNT(a.id)                                        AS attempts,
           COUNT(a.id) FILTER (WHERE a."isCorrect")           AS correct
      FROM "BankQuestion" q
      LEFT JOIN "BankAttempt" a
        ON a."questionId" = q.id AND a."studentId" = ${studentId ?? ""}
     WHERE q.published
     GROUP BY q."skillId"`;

  return new Map(
    rows.map((r) => [
      r.skill_id,
      {
        total: Number(r.total),
        attempted: Number(r.attempted),
        attempts: Number(r.attempts),
        correct: Number(r.correct),
      },
    ]),
  );
}

export function sumStats(list: SkillStats[]): SkillStats {
  return list.reduce(
    (acc, s) => ({
      total: acc.total + s.total,
      attempted: acc.attempted + s.attempted,
      attempts: acc.attempts + s.attempts,
      correct: acc.correct + s.correct,
    }),
    { ...EMPTY },
  );
}

/** The whole tree, with each student's numbers folded in. */
export async function loadSubjects(studentId: string | null) {
  const [subjects, stats] = await Promise.all([
    db.bankSubject.findMany({
      orderBy: { order: "asc" },
      include: {
        domains: {
          orderBy: { order: "asc" },
          include: {
            skills: {
              orderBy: { order: "asc" },
              include: { _count: { select: { sessions: true } } },
            },
          },
        },
      },
    }),
    statsBySkill(studentId),
  ]);

  return subjects.map((s) => {
    const domains = s.domains.map((d) => {
      const skills = d.skills.map((k) => ({ ...k, stats: stats.get(k.id) ?? EMPTY }));
      return { ...d, skills, stats: sumStats(skills.map((k) => k.stats)) };
    });
    return {
      ...s,
      domains,
      skillCount: domains.reduce((n, d) => n + d.skills.length, 0),
      stats: sumStats(domains.map((d) => d.stats)),
    };
  });
}

/** Same rollup as statsBySkill, but grouped by the session that taught it. */
export async function statsBySession(
  skillId: string,
  studentId: string | null,
): Promise<Map<string, SkillStats>> {
  const rows = await db.$queryRaw<
    { session_id: string | null; total: bigint; attempted: bigint; attempts: bigint; correct: bigint }[]
  >`
    SELECT q."sessionId"                              AS session_id,
           COUNT(DISTINCT q.id)                       AS total,
           COUNT(DISTINCT a."questionId")             AS attempted,
           COUNT(a.id)                                AS attempts,
           COUNT(a.id) FILTER (WHERE a."isCorrect")   AS correct
      FROM "BankQuestion" q
      LEFT JOIN "BankAttempt" a
        ON a."questionId" = q.id AND a."studentId" = ${studentId ?? ""}
     WHERE q.published AND q."skillId" = ${skillId}
     GROUP BY q."sessionId"`;

  return new Map(
    rows.map((r) => [
      r.session_id ?? "__unassigned",
      {
        total: Number(r.total),
        attempted: Number(r.attempted),
        attempts: Number(r.attempts),
        correct: Number(r.correct),
      },
    ]),
  );
}

export type ActivityDay = {
  date: string;
  label: string;
  correct: { easy: number; medium: number; hard: number };
  wrong: { easy: number; medium: number; hard: number };
};

export type BankAnalytics = {
  attempted: number;
  attempts: number;
  correct: number;
  accuracy: number | null;
  saved: number;
  streak: number;
  activity: ActivityDay[];
};

const DAY_KEY = new Intl.DateTimeFormat("en-CA", {
  timeZone: CENTRE_TZ, year: "numeric", month: "2-digit", day: "2-digit",
});
const DAY_LABEL = new Intl.DateTimeFormat("en-GB", {
  timeZone: CENTRE_TZ, day: "numeric", month: "short",
});

/**
 * The numbers on the analytics strip.
 *
 * Days are bucketed in the centre's timezone, not the server's, so a question
 * answered at 9pm in Baku counts towards that evening rather than the next
 * morning — which is what breaks a streak nobody actually broke.
 */
export async function bankAnalytics(studentId: string, days = 14): Promise<BankAnalytics> {
  const since = startOfToday();
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const [totals, saved, recent, attemptDays] = await Promise.all([
    db.bankAttempt.aggregate({
      where: { studentId },
      _count: { _all: true },
    }),
    db.bankSaved.count({ where: { studentId } }),
    db.bankAttempt.findMany({
      where: { studentId, createdAt: { gte: since } },
      select: { createdAt: true, isCorrect: true, question: { select: { difficulty: true } } },
    }),
    db.$queryRaw<{ day: string }[]>`
      SELECT DISTINCT to_char("createdAt" AT TIME ZONE 'Asia/Baku', 'YYYY-MM-DD') AS day
        FROM "BankAttempt"
       WHERE "studentId" = ${studentId}
       ORDER BY day DESC
       LIMIT 400`,
  ]);

  const correctCount = await db.bankAttempt.count({ where: { studentId, isCorrect: true } });
  const distinct = await db.bankAttempt.findMany({
    where: { studentId },
    distinct: ["questionId"],
    select: { questionId: true },
  });

  // buckets for the trend
  const buckets = new Map<string, ActivityDay>();
  for (let i = 0; i < days; i += 1) {
    const d = new Date(since);
    d.setUTCDate(d.getUTCDate() + i);
    const key = DAY_KEY.format(d);
    buckets.set(key, {
      date: key,
      label: DAY_LABEL.format(d),
      correct: { easy: 0, medium: 0, hard: 0 },
      wrong: { easy: 0, medium: 0, hard: 0 },
    });
  }
  for (const a of recent) {
    const bucket = buckets.get(DAY_KEY.format(a.createdAt));
    if (!bucket) continue;
    const band = a.question.difficulty === "EASY" ? "easy" : a.question.difficulty === "HARD" ? "hard" : "medium";
    (a.isCorrect ? bucket.correct : bucket.wrong)[band] += 1;
  }

  // streak: consecutive days up to today (or up to yesterday, if nothing yet today)
  const active = new Set(attemptDays.map((r) => r.day));
  let streak = 0;
  const cursor = new Date(startOfToday());
  if (!active.has(DAY_KEY.format(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (active.has(DAY_KEY.format(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  const attempts = totals._count._all;

  return {
    attempted: distinct.length,
    attempts,
    correct: correctCount,
    accuracy: attempts > 0 ? Math.round((correctCount / attempts) * 100) : null,
    saved,
    streak,
    activity: [...buckets.values()],
  };
}

/**
 * Pull a set of questions to practise.
 *
 * Whole-subject practice is shuffled and capped, because "practise everything"
 * across 2,000 questions is not a session anybody finishes. A single topic or
 * session is kept in the order the teacher put it in, since that order is
 * usually a progression.
 */
export async function loadPracticeSet(opts: {
  subjectSlug: string;
  skillSlug?: string;
  sessionId?: string;
  studentId?: string | null;
  limit?: number;
}) {
  const where = {
    published: true,
    ...(opts.sessionId ? { sessionId: opts.sessionId } : {}),
    skill: {
      ...(opts.skillSlug ? { slug: opts.skillSlug } : {}),
      domain: { subject: { slug: opts.subjectSlug } },
    },
  };

  const mixed = !opts.skillSlug && !opts.sessionId;
  const questions = await db.bankQuestion.findMany({
    where,
    orderBy: mixed ? { id: "asc" } : [{ skillId: "asc" }, { order: "asc" }],
    take: mixed ? 400 : 200,
    select: {
      id: true, difficulty: true, passage: true, prompt: true, options: true,
      skill: { select: { name: true } },
    },
  });

  const chosen = mixed ? shuffle(questions).slice(0, opts.limit ?? 20) : questions;

  const saved = opts.studentId
    ? new Set(
        (
          await db.bankSaved.findMany({
            where: { studentId: opts.studentId, questionId: { in: chosen.map((q) => q.id) } },
            select: { questionId: true },
          })
        ).map((r) => r.questionId),
      )
    : new Set<string>();

  return chosen.map((q) => ({
    id: q.id,
    difficulty: q.difficulty,
    passage: q.passage,
    prompt: q.prompt,
    options: Array.isArray(q.options) ? (q.options as string[]) : [],
    skillName: q.skill.name,
    saved: saved.has(q.id),
  }));
}

function shuffle<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Whose numbers are we showing? A student sees their own; staff pick one. */
export async function resolveBankStudent(
  user: { id: string; role: string },
  requested?: string,
): Promise<{ id: string; fullName: string } | null> {
  if (user.role === "STUDENT") {
    return db.studentProfile.findFirst({
      where: { userId: user.id },
      select: { id: true, fullName: true },
    });
  }
  if (!requested) return null;
  return db.studentProfile.findUnique({
    where: { id: requested },
    select: { id: true, fullName: true },
  });
}
