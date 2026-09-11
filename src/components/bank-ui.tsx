import Link from "next/link";
import type { ActivityDay } from "@/lib/question-bank";

const ACCENT: Record<string, { from: string; to: string }> = {
  violet: { from: "from-fuchsia-400", to: "to-purple-500" },
  sky: { from: "from-sky-400", to: "to-blue-600" },
  default: { from: "from-slate-500", to: "to-slate-700" },
};

/** One subject on the Question Bank front screen. */
export function SubjectCard({
  name, blurb, href, solved, total, accent,
}: {
  name: string; blurb: string | null; href: string;
  solved: number; total: number; accent: string | null;
}) {
  const tone = ACCENT[accent ?? "default"] ?? ACCENT.default;
  const pct = total > 0 ? Math.round((solved / total) * 100) : 0;

  return (
    <Link
      href={href}
      className={`group relative block overflow-hidden rounded-2xl bg-gradient-to-br ${tone.from} ${tone.to} p-5 text-white transition hover:brightness-105`}
    >
      <h3 className="text-xl font-extrabold">{name}</h3>
      {blurb && <p className="mt-0.5 max-w-xs text-sm text-white/75">{blurb}</p>}

      <div className="mt-4 flex items-baseline justify-between text-sm font-semibold">
        <span className="text-white/85">
          {total > 0 ? `${solved.toLocaleString()} of ${total.toLocaleString()} solved` : "No questions loaded yet"}
        </span>
        {total > 0 && <span>{pct}%</span>}
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/25">
        <div className="h-full rounded-full bg-white transition-all" style={{ width: `${pct}%` }} />
      </div>

      <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-white px-3.5 py-1.5 text-sm font-bold text-ink">
        Open <span aria-hidden className="transition group-hover:translate-x-0.5">›</span>
      </span>
    </Link>
  );
}

export function StatTile({
  label, value, hint, action,
}: {
  label: string; value: string; hint?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between border-black/10 px-5 py-4 not-last:border-r">
      <p className="text-sm text-ink/55">{label}</p>
      <div className="mt-1.5 flex items-end justify-between gap-2">
        <p className="text-3xl font-extrabold leading-none">{value}</p>
        {action}
      </div>
      {hint && <p className="mt-1 text-xs text-ink/40">{hint}</p>}
    </div>
  );
}

/**
 * Attempts per day, correct above the line in green and wrong in red.
 * Harder questions are drawn darker, so a day of easy wins reads differently
 * from a day of hard ones at a glance.
 */
export function ActivityTrend({ days }: { days: ActivityDay[] }) {
  const totals = days.map((d) => {
    const c = d.correct.easy + d.correct.medium + d.correct.hard;
    const w = d.wrong.easy + d.wrong.medium + d.wrong.hard;
    return { day: d, correct: c, wrong: w, total: c + w };
  });
  const peak = Math.max(1, ...totals.map((t) => t.total));
  const correct = totals.reduce((n, t) => n + t.correct, 0);
  const wrong = totals.reduce((n, t) => n + t.wrong, 0);

  const band = (kind: "correct" | "wrong", level: "easy" | "medium" | "hard") => {
    const greens = { easy: "bg-emerald-200", medium: "bg-emerald-400", hard: "bg-emerald-600" };
    const reds = { easy: "bg-red-200", medium: "bg-red-400", hard: "bg-red-600" };
    return kind === "correct" ? greens[level] : reds[level];
  };

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5">
      <h3 className="text-lg font-extrabold">Activity trend</h3>
      <p className="mt-0.5 text-sm text-ink/55">
        Wrong in red, correct in green. Harder questions look darker.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-5 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-emerald-500" aria-hidden />
          <strong className="text-lg">{correct}</strong> correct
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-500" aria-hidden />
          <strong className="text-lg">{wrong}</strong> wrong
        </span>
        <span className="text-ink/40">last {days.length} days</span>
      </div>

      {correct + wrong === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-black/15 py-8 text-center text-sm text-ink/40">
          Nothing practised yet — this fills in as questions are answered.
        </p>
      ) : (
        <div className="mt-5 flex h-40 items-end gap-1.5 overflow-x-auto">
          {totals.map((t) => (
            <div key={t.day.date} className="flex min-w-6 flex-1 flex-col items-center gap-1">
              <div
                className="flex w-full flex-col-reverse justify-end"
                style={{ height: `${(t.total / peak) * 100}%` }}
                title={`${t.day.label}: ${t.correct} correct, ${t.wrong} wrong`}
              >
                {(["easy", "medium", "hard"] as const).map((lvl) =>
                  t.day.wrong[lvl] > 0 ? (
                    <div key={`w${lvl}`} className={band("wrong", lvl)} style={{ flexGrow: t.day.wrong[lvl] }} />
                  ) : null,
                )}
                {(["easy", "medium", "hard"] as const).map((lvl) =>
                  t.day.correct[lvl] > 0 ? (
                    <div key={`c${lvl}`} className={band("correct", lvl)} style={{ flexGrow: t.day.correct[lvl] }} />
                  ) : null,
                )}
              </div>
              <span className="whitespace-nowrap text-[10px] text-ink/35">{t.day.label.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Thin progress bar used in the skill table. */
export function MiniBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="h-1.5 w-full max-w-32 overflow-hidden rounded-full bg-black/10">
      <div className="h-full rounded-full bg-sky-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function AccuracyDot({ value }: { value: number | null }) {
  if (value === null) return <span className="text-ink/30">–</span>;
  const tone = value >= 80 ? "bg-emerald-500" : value >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <span className="flex items-center justify-end gap-1.5 whitespace-nowrap">
      <span className={`h-2 w-2 rounded-full ${tone}`} aria-hidden />
      <span className="font-semibold">{value}</span>
      <span className="text-ink/40">%</span>
    </span>
  );
}
