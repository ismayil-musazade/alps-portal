import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { inputBase } from "@/components/ui";
import { loadSubjects, bankAnalytics, resolveBankStudent } from "@/lib/question-bank";
import { SubjectCard, StatTile, ActivityTrend } from "@/components/bank-ui";
import { AddDemoBankQuestions } from "@/components/demo-paper-button";

export const dynamic = "force-dynamic";

export default async function QuestionBankPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!can(user.role, "bank.view")) redirect("/app");

  const sp = await searchParams;
  const student = await resolveBankStudent(user, sp.student);
  const isStaff = user.role !== "STUDENT" && user.role !== "PARENT";

  const [subjects, analytics, students] = await Promise.all([
    loadSubjects(student?.id ?? null),
    student ? bankAnalytics(student.id) : null,
    isStaff
      ? db.studentProfile.findMany({
          where: { status: "ACTIVE" },
          select: { id: true, fullName: true },
          orderBy: { fullName: "asc" },
        })
      : [],
  ]);

  const q = (id?: string) => (id ? `?student=${id}` : "");

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold">
          <VaultIcon /> Question Bank
        </h1>
        {isStaff && (
          <form className="ml-auto flex items-center gap-2">
            <label htmlFor="student" className="text-sm text-ink/50">Viewing</label>
            <select
              id="student"
              name="student"
              defaultValue={student?.id ?? ""}
              className={`${inputBase} w-52`}
            >
              <option value="">Nobody — just the syllabus</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.fullName}</option>
              ))}
            </select>
            <button className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-black">
              Show
            </button>
          </form>
        )}
      </div>

      {isStaff && !student && (
        <p className="mt-2 text-sm text-ink/50">
          Pick a student to see their progress. Without one you are looking at the syllabus itself.
        </p>
      )}

      {can(user.role, "bank.manage") && subjects.every((s) => s.stats.total === 0) && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-brand/30 bg-brand-tint/40 px-4 py-3">
          <p className="min-w-0 flex-1 text-sm">
            All 29 skills are set up and waiting for questions. Load the five samples to see
            practice working end to end.
          </p>
          <AddDemoBankQuestions />
        </div>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {subjects.map((s) => (
          <SubjectCard
            key={s.id}
            name={s.name}
            blurb={s.blurb}
            accent={s.accent}
            href={`/app/bank/${s.slug}${q(student?.id)}`}
            solved={s.stats.attempted}
            total={s.stats.total}
          />
        ))}
      </div>

      {student && analytics && (
        <>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <h2 className="flex items-center gap-2 text-2xl font-extrabold">
              <ChartIcon /> Question Analytics
            </h2>
            <span className="text-sm text-ink/50">{student.fullName}</span>
          </div>

          <div className="mt-4 grid grid-cols-2 divide-y divide-black/10 rounded-2xl border border-black/10 bg-white sm:grid-cols-4 sm:divide-y-0">
            <StatTile label="Questions Attempted" value={String(analytics.attempts)} />
            <StatTile
              label="Current Accuracy"
              value={analytics.accuracy === null ? "–" : `${analytics.accuracy}%`}
            />
            <StatTile
              label="Saved Questions"
              value={String(analytics.saved)}
              action={
                analytics.saved > 0 ? (
                  <Link
                    href={`/app/bank/saved${q(student.id)}`}
                    className="rounded-full border border-black/15 px-3 py-1 text-xs font-semibold hover:bg-black/5"
                  >
                    View
                  </Link>
                ) : undefined
              }
            />
            <StatTile
              label="Study Streak"
              value={String(analytics.streak)}
              hint={analytics.streak === 1 ? "day" : "days in a row"}
            />
          </div>

          <div className="mt-4">
            <ActivityTrend days={analytics.activity} />
          </div>
        </>
      )}
    </>
  );
}

function VaultIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-ink/40" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 5.5v1.5M12 17v1.5" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-ink/40" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}
