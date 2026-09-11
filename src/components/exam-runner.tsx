"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { optionLetter } from "@/lib/exam-marking";

export type RunnerQuestion = {
  id: string;
  order: number;
  section: string | null;
  passage: string | null;
  prompt: string;
  options: string[];
};

type MarkResult = {
  score: number;
  maxScore: number;
  percent: number;
  answered: number;
  sectionScores: Record<string, { score: number; max: number }>;
  questions: {
    id: string; order: number; section: string | null;
    given: string | null; correct: string; isCorrect: boolean;
  }[];
};

function clock(seconds: number) {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * The exam as a candidate sees it.
 *
 * The correct answers are never sent to this component — it collects choices
 * and asks the server to mark them, so the key cannot be read out of the page
 * by a candidate who knows where to look.
 */
export function ExamRunner({
  title,
  durationMin,
  questions,
  markUrl,
  preview = false,
  candidateName,
  backHref,
}: {
  title: string;
  durationMin: number;
  questions: RunnerQuestion[];
  markUrl: string;
  preview?: boolean;
  candidateName?: string;
  backHref?: string;
}) {
  const [at, setAt] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [left, setLeft] = useState(durationMin * 60);
  const [reviewing, setReviewing] = useState(false);
  const [result, setResult] = useState<MarkResult | null>(null);
  const [busy, setBusy] = useState(false);
  const submitted = useRef(false);

  const q = questions[at];
  const answeredCount = Object.values(answers).filter(Boolean).length;

  const submit = useCallback(async () => {
    if (submitted.current) return;
    submitted.current = true;
    setBusy(true);
    const res = await fetch(markUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setResult(data.result);
    else submitted.current = false;
    setBusy(false);
  }, [answers, markUrl]);

  useEffect(() => {
    if (result) return;
    const t = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          // time is up — hand in whatever is on the page
          void submit();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [result, submit]);

  const byId = useMemo(() => Object.fromEntries(questions.map((x) => [x.id, x])), [questions]);

  // ---------- after marking ----------
  if (result) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-black/10 bg-white p-8 text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-ink/50">
            {preview ? "Preview result — nothing was saved" : "Finished"}
          </p>
          <p className="mt-4 text-6xl font-extrabold text-brand">
            {result.score}
            <span className="text-2xl text-ink/30">/{result.maxScore}</span>
          </p>
          <p className="mt-1 text-lg font-semibold">{result.percent}%</p>
          <p className="mt-1 text-sm text-ink/50">
            {result.answered} of {result.maxScore} questions answered
          </p>

          {Object.keys(result.sectionScores).length > 1 && (
            <div className="mt-6 space-y-2 text-left">
              {Object.entries(result.sectionScores).map(([name, s]) => (
                <div key={name}>
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">{name}</span>
                    <span className="text-ink/60">{s.score}/{s.max}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/10">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${(s.score / s.max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* The key is shown when a manager is previewing, and withheld from a
            real candidate — a placement paper gets reused next week. */}
        {preview && (
        <div className="mt-4 rounded-2xl border border-black/10 bg-white p-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink/50">Question by question</h3>
          <ul className="space-y-1.5">
            {result.questions.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-paper px-3 py-2 text-sm">
                <span className="w-6 font-bold text-ink/40">{r.order}</span>
                <span className={`w-20 font-bold ${r.isCorrect ? "text-ok" : "text-risk"}`}>
                  {r.isCorrect ? "✓ correct" : "✗ wrong"}
                </span>
                <span className="text-ink/60">
                  chose <strong className="text-ink">{r.given === null ? "—" : optionLetter(Number(r.given))}</strong>
                  {!r.isCorrect && <> · answer <strong className="text-ink">{optionLetter(Number(r.correct))}</strong></>}
                </span>
                <span className="ml-auto text-xs text-ink/40">{r.section}</span>
              </li>
            ))}
          </ul>
        </div>
        )}

        {!preview && (
          <p className="mt-4 text-center text-sm text-ink/60">
            Thank you — your result has been sent to the front desk. You can close this now.
          </p>
        )}

        {preview && (
          <p className="mt-4 text-center text-sm text-ink/50">
            On a real sitting this score attaches to the candidate&rsquo;s record in the CRM.
          </p>
        )}
        {backHref && (
          <p className="mt-4 text-center">
            <a href={backHref} className="text-sm font-semibold text-brand hover:underline">
              ← Back to the papers
            </a>
          </p>
        )}
      </div>
    );
  }

  // ---------- review screen ----------
  if (reviewing) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h2 className="text-2xl font-extrabold">Check your answers</h2>
        <p className="mt-1 text-sm text-ink/60">
          {answeredCount} of {questions.length} answered
          {answeredCount < questions.length && " — anything left blank scores nothing."}
        </p>
        <ul className="mt-5 space-y-1.5">
          {questions.map((x, i) => (
            <li key={x.id}>
              <button
                onClick={() => { setAt(i); setReviewing(false); }}
                className="flex w-full items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 text-left text-sm hover:border-brand/40"
              >
                <span className="w-6 font-bold text-ink/40">{x.order}</span>
                <span className="min-w-0 flex-1 truncate">{x.prompt}</span>
                {flagged[x.id] && <span title="Marked for review">🚩</span>}
                <span className={`font-bold ${answers[x.id] ? "text-ok" : "text-ink/25"}`}>
                  {answers[x.id] ? optionLetter(Number(answers[x.id])) : "—"}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={submit}
            disabled={busy}
            className="rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-40"
          >
            {busy ? "Handing in…" : "Hand in"}
          </button>
          <button
            onClick={() => setReviewing(false)}
            className="rounded-full border border-black/15 px-6 py-2.5 text-sm font-semibold hover:bg-black/5"
          >
            Back to the questions
          </button>
        </div>
      </div>
    );
  }

  // ---------- the exam ----------
  const low = left <= 60;
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-2.5">
          <span className="font-extrabold">{title}</span>
          {q.section && (
            <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-bold text-ink/50">{q.section}</span>
          )}
          {preview && (
            <span className="rounded-full bg-warn/15 px-2.5 py-0.5 text-xs font-bold text-warn">PREVIEW</span>
          )}
          {backHref && (
            <a href={backHref} className="text-sm font-semibold text-ink/40 hover:text-brand">
              Leave preview
            </a>
          )}
          {candidateName && <span className="text-sm text-ink/50">{candidateName}</span>}
          <span
            className={`ml-auto rounded-full px-3 py-1 font-mono text-sm font-bold tabular-nums ${
              low ? "bg-risk/10 text-risk" : "bg-black/5 text-ink/70"
            }`}
            aria-label="Time remaining"
          >
            {clock(left)}
          </span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-5">
        <div className="grid gap-6 lg:grid-cols-2">
          {q.passage && (
            <div className="lg:border-r lg:border-black/10 lg:pr-6">
              <p className="whitespace-pre-line text-[15px] leading-7 text-ink/90">{q.passage}</p>
            </div>
          )}

          <div className={q.passage ? "" : "lg:col-span-2"}>
            <div className="mb-3 flex items-center gap-3">
              <span className="rounded-lg bg-ink px-2.5 py-1 text-sm font-bold text-white">{q.order}</span>
              <button
                onClick={() => setFlagged((f) => ({ ...f, [q.id]: !f[q.id] }))}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  flagged[q.id] ? "bg-warn/15 text-warn" : "text-ink/40 hover:bg-black/5"
                }`}
              >
                {flagged[q.id] ? "🚩 Marked" : "Mark for review"}
              </button>
            </div>

            <p className="font-semibold leading-6">{q.prompt}</p>

            <div className="mt-4 space-y-2">
              {q.options.map((opt, i) => {
                const chosen = answers[q.id] === String(i);
                return (
                  <button
                    key={i}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: String(i) }))}
                    className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-[15px] leading-6 transition ${
                      chosen
                        ? "border-brand bg-brand-tint/60"
                        : "border-black/15 bg-white hover:border-brand/40"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                        chosen ? "border-brand bg-brand text-white" : "border-black/25 text-ink/60"
                      }`}
                    >
                      {optionLetter(i)}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            {answers[q.id] && (
              <button
                onClick={() => setAnswers((a) => { const n = { ...a }; delete n[q.id]; return n; })}
                className="mt-2 text-xs font-semibold text-ink/40 hover:text-brand"
              >
                Clear my answer
              </button>
            )}
          </div>
        </div>
      </div>

      <footer className="sticky bottom-0 border-t border-black/10 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-2.5">
          <button
            onClick={() => setAt((i) => Math.max(0, i - 1))}
            disabled={at === 0}
            className="rounded-full border border-black/15 px-4 py-1.5 text-sm font-semibold hover:bg-black/5 disabled:opacity-30"
          >
            Back
          </button>

          <div className="flex flex-wrap items-center gap-1">
            {questions.map((x, i) => (
              <button
                key={x.id}
                onClick={() => setAt(i)}
                aria-label={`Question ${x.order}`}
                className={`h-8 w-8 rounded-lg text-xs font-bold ${
                  i === at
                    ? "bg-ink text-white"
                    : answers[x.id]
                      ? "bg-brand-tint text-brand-dark"
                      : "bg-black/5 text-ink/40"
                } ${flagged[x.id] ? "ring-2 ring-warn" : ""}`}
              >
                {x.order}
              </button>
            ))}
          </div>

          <span className="hidden text-sm text-ink/50 sm:inline">
            {answeredCount}/{questions.length} answered
          </span>

          {at === questions.length - 1 ? (
            <button
              onClick={() => setReviewing(true)}
              className="ml-auto rounded-full bg-brand px-5 py-1.5 text-sm font-bold text-white hover:bg-brand-dark"
            >
              Review &amp; hand in
            </button>
          ) : (
            <button
              onClick={() => setAt((i) => Math.min(questions.length - 1, i + 1))}
              className="ml-auto rounded-full bg-ink px-5 py-1.5 text-sm font-bold text-white hover:bg-black"
            >
              Next
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
