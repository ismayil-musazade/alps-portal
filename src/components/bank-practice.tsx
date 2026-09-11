"use client";

import { useState } from "react";
import Link from "next/link";
import { optionLetter } from "@/lib/exam-marking";

export type PracticeQuestion = {
  id: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  passage: string | null;
  prompt: string;
  options: string[];
  skillName: string;
  saved: boolean;
};

const BAND: Record<string, { label: string; cls: string }> = {
  EASY: { label: "Easy", cls: "bg-emerald-100 text-emerald-800" },
  MEDIUM: { label: "Medium", cls: "bg-amber-100 text-amber-800" },
  HARD: { label: "Hard", cls: "bg-red-100 text-red-800" },
};

type Feedback = { isCorrect: boolean; correct: string; explanation: string | null; recorded: boolean };

/**
 * Practice, not an exam: you answer, you find out immediately, and you get the
 * explanation while the question is still in your head. That is the whole
 * difference — a timed paper withholds all of this until the end.
 */
export function PracticeRunner({
  title, backHref, questions, recording,
}: {
  title: string;
  backHref: string;
  questions: PracticeQuestion[];
  recording: boolean;
}) {
  const [at, setAt] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<Record<string, boolean>>(
    Object.fromEntries(questions.map((q) => [q.id, q.saved])),
  );
  const [tally, setTally] = useState({ right: 0, wrong: 0 });
  const [startedAt, setStartedAt] = useState(() => Date.now());

  const q = questions[at];
  const done = at >= questions.length;

  async function check() {
    if (choice === null || busy) return;
    setBusy(true);
    const res = await fetch("/api/bank/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: q.id,
        given: choice,
        seconds: Math.round((Date.now() - startedAt) / 1000),
      }),
    });
    const data = await res.json().catch(() => null);
    if (data?.ok) {
      setFeedback(data);
      setTally((t) => (data.isCorrect ? { ...t, right: t.right + 1 } : { ...t, wrong: t.wrong + 1 }));
    }
    setBusy(false);
  }

  function next() {
    setAt((i) => i + 1);
    setChoice(null);
    setFeedback(null);
    setStartedAt(Date.now());
  }

  async function toggleSave() {
    const res = await fetch("/api/bank/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: q.id }),
    });
    const data = await res.json().catch(() => null);
    if (data?.ok) setSaved((s) => ({ ...s, [q.id]: data.saved }));
  }

  if (done) {
    const total = tally.right + tally.wrong;
    const pct = total > 0 ? Math.round((tally.right / total) * 100) : 0;
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <div className="rounded-2xl border border-black/10 bg-white p-8">
          <p className="text-sm font-bold uppercase tracking-wide text-ink/50">Practice finished</p>
          <p className="mt-4 text-6xl font-extrabold text-brand">
            {tally.right}
            <span className="text-2xl text-ink/30">/{total}</span>
          </p>
          <p className="mt-1 text-lg font-semibold">{pct}%</p>
          {!recording && (
            <p className="mt-3 rounded-xl bg-warn/10 px-4 py-2 text-sm text-ink/70">
              Nothing was recorded — you are not practising as a student.
            </p>
          )}
        </div>
        <div className="mt-4 flex justify-center gap-2">
          <Link href={backHref} className="rounded-full border border-black/15 bg-white px-5 py-2 text-sm font-semibold hover:bg-black/5">
            Back to the topic
          </Link>
          <button
            onClick={() => { setAt(0); setChoice(null); setFeedback(null); setTally({ right: 0, wrong: 0 }); }}
            className="rounded-full bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark"
          >
            Go again
          </button>
        </div>
      </div>
    );
  }

  const band = BAND[q.difficulty];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Link href={backHref} className="text-sm text-ink/50 hover:text-brand">← {title}</Link>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${band.cls}`}>{band.label}</span>
        <span className="text-sm text-ink/50">{q.skillName}</span>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="text-ok">✓ {tally.right}</span>
          <span className="text-risk">✗ {tally.wrong}</span>
          <span className="font-semibold text-ink/60">{at + 1} / {questions.length}</span>
        </div>
      </div>

      <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/10">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(at / questions.length) * 100}%` }} />
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        {q.passage && (
          <div className="lg:border-r lg:border-black/10 lg:pr-6">
            <p className="whitespace-pre-line text-[15px] leading-7 text-ink/90">{q.passage}</p>
          </div>
        )}

        <div className={q.passage ? "" : "lg:col-span-2"}>
          <div className="flex items-start gap-3">
            <p className="min-w-0 flex-1 font-semibold leading-6">{q.prompt}</p>
            {recording && (
              <button
                onClick={toggleSave}
                title={saved[q.id] ? "Remove bookmark" : "Save for later"}
                className={`shrink-0 rounded-full px-2 py-1 text-lg leading-none ${
                  saved[q.id] ? "text-warn" : "text-ink/25 hover:text-ink/50"
                }`}
              >
                {saved[q.id] ? "★" : "☆"}
              </button>
            )}
          </div>

          <div className="mt-4 space-y-2">
            {q.options.map((opt, i) => {
              const value = String(i);
              const picked = choice === value;
              const isKey = feedback && feedback.correct === value;
              const isWrongPick = feedback && picked && !feedback.isCorrect;

              return (
                <button
                  key={i}
                  disabled={Boolean(feedback)}
                  onClick={() => setChoice(value)}
                  className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-[15px] leading-6 transition ${
                    isKey
                      ? "border-emerald-500 bg-emerald-50"
                      : isWrongPick
                        ? "border-red-500 bg-red-50"
                        : picked
                          ? "border-brand bg-brand-tint/60"
                          : "border-black/15 bg-white hover:border-brand/40"
                  } ${feedback ? "cursor-default" : ""}`}
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                      isKey
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : isWrongPick
                          ? "border-red-500 bg-red-500 text-white"
                          : picked
                            ? "border-brand bg-brand text-white"
                            : "border-black/25 text-ink/60"
                    }`}
                  >
                    {optionLetter(i)}
                  </span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>

          {feedback && (
            <div
              className={`mt-4 rounded-xl border p-4 ${
                feedback.isCorrect ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"
              }`}
            >
              <p className="font-bold">
                {feedback.isCorrect
                  ? "Correct"
                  : `Not quite — the answer is ${optionLetter(Number(feedback.correct))}`}
              </p>
              {feedback.explanation ? (
                <p className="mt-1 whitespace-pre-line text-sm text-ink/80">{feedback.explanation}</p>
              ) : (
                <p className="mt-1 text-sm text-ink/50">No explanation written for this one yet.</p>
              )}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            {!feedback ? (
              <button
                onClick={check}
                disabled={choice === null || busy}
                className="rounded-full bg-brand px-6 py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-30"
              >
                {busy ? "Checking…" : "Check"}
              </button>
            ) : (
              <button
                onClick={next}
                className="rounded-full bg-ink px-6 py-2 text-sm font-bold text-white hover:bg-black"
              >
                {at === questions.length - 1 ? "Finish" : "Next question"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
