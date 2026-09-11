import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { inputBase } from "@/components/ui";
import {
  loadSubjects, resolveBankStudent, accuracy, type SkillStats,
} from "@/lib/question-bank";
import { MiniBar, AccuracyDot } from "@/components/bank-ui";

export const dynamic = "force-dynamic";

type Query = { student?: string; show?: string; order?: string };

/** "Completed" filters on progress, which is what the word means to a student. */
function matchesShow(show: string | undefined, s: SkillStats) {
  if (show === "completed") return s.total > 0 && s.attempted >= s.total;
  if (show === "in-progress") return s.attempted > 0 && s.attempted < s.total;
  if (show === "not-started") return s.attempted === 0;
  return true;
}

export default async function SubjectPage({
  params, searchParams,
}: {
  params: Promise<{ subject: string }>;
  searchParams: Promise<Query>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!can(user.role, "bank.view")) redirect("/app");

  const { subject: slug } = await params;
  const sp = await searchParams;
  const student = await resolveBankStudent(user, sp.student);

  const subjects = await loadSubjects(student?.id ?? null);
  const subject = subjects.find((s) => s.slug === slug);
  if (!subject) notFound();

  const q = student ? `?student=${student.id}` : "";
  const keep = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (student) p.set("student", student.id);
    for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
    const str = p.toString();
    return `/app/bank/${subject.slug}${str ? `?${str}` : ""}`;
  };

  // "weakest first" is the order a teacher actually wants to teach in
  const weakestFirst = sp.order === "weakest";
  const domains = subject.domains
    .map((d) => ({
      ...d,
      skills: d.skills
        .filter((k) => matchesShow(sp.show, k.stats))
        .sort((a, b) =>
          weakestFirst
            ? (accuracy(a.stats) ?? 101) - (accuracy(b.stats) ?? 101)
            : a.order - b.order,
        ),
    }))
    .filter((d) => d.skills.length > 0);

  const shown = domains.reduce((n, d) => n + d.skills.length, 0);
  const hasQuestions = subject.stats.total > 0;

  return (
    <>
      <Link href={`/app/bank${q}`} className="text-sm text-ink/50 hover:text-brand">
        ← Back to Question Bank
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold">{subject.name}</h1>
        {student && <span className="text-sm text-ink/50">{student.fullName}</span>}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          ["", "All skills"],
          ["not-started", "Not started"],
          ["in-progress", "In progress"],
          ["completed", "Completed"],
        ].map(([value, label]) => (
          <Link
            key={label}
            href={keep({ show: value, order: sp.order ?? "" })}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${
              (sp.show ?? "") === value ? "bg-ink text-white" : "bg-black/5 text-ink/70 hover:bg-black/10"
            }`}
          >
            {label}
          </Link>
        ))}
        <Link
          href={keep({ show: sp.show ?? "", order: weakestFirst ? "" : "weakest" })}
          className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${
            weakestFirst ? "bg-ink text-white" : "bg-black/5 text-ink/70 hover:bg-black/10"
          }`}
        >
          {weakestFirst ? "Order: weakest first" : "Order: syllabus"}
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-black/10 bg-white px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="font-bold">Practice all topics</p>
          <p className="text-sm text-ink/55">
            {hasQuestions
              ? `Mixed practice across all ${subject.skillCount} skills in ${subject.name}.`
              : `All ${subject.skillCount} skills are set up. Questions are not loaded yet.`}
          </p>
        </div>
        <Link
          href={`/app/bank/${subject.slug}/practice${q}`}
          aria-disabled={!hasQuestions}
          className={`rounded-full px-5 py-2 text-sm font-bold ${
            hasQuestions
              ? "bg-brand text-white hover:bg-brand-dark"
              : "pointer-events-none bg-black/10 text-ink/30"
          }`}
        >
          Start practice
        </Link>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-160 text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left text-ink/50">
              <th className="py-2 font-semibold">Topic</th>
              <th className="w-56 py-2 font-semibold">Progress</th>
              <th className="w-28 py-2 text-right font-semibold">Accuracy</th>
            </tr>
          </thead>
          {domains.map((d) => (
            <tbody key={d.id}>
              <tr>
                <td colSpan={3} className="pb-1 pt-7">
                  <h2 className="text-xl font-extrabold">{d.name}</h2>
                </td>
              </tr>
              {d.skills.map((k) => (
                <tr key={k.id} className="border-t border-black/5 hover:bg-black/[0.02]">
                  <td className="py-2.5 pr-4">
                    <Link href={`/app/bank/${subject.slug}/${k.slug}${q}`} className="group block">
                      <span className="font-medium group-hover:text-brand group-hover:underline">
                        {k.name}
                      </span>
                      <span className="ml-2 whitespace-nowrap text-xs text-ink/40">
                        {k._count.sessions > 0
                          ? `${k._count.sessions} session${k._count.sessions === 1 ? "" : "s"}`
                          : "no sessions yet"}
                      </span>
                    </Link>
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-3">
                      <MiniBar value={k.stats.attempted} max={k.stats.total} />
                      <span className="whitespace-nowrap text-ink/50">
                        {k.stats.attempted}/{k.stats.total}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 text-right">
                    <AccuracyDot value={accuracy(k.stats)} />
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>

      {shown === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-black/15 bg-white px-4 py-10 text-center text-sm text-ink/40">
          No skills match that filter.
        </p>
      )}
    </>
  );
}
