import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import {
  statsBySession, resolveBankStudent, accuracy, EMPTY, sumStats,
} from "@/lib/question-bank";
import { MiniBar, AccuracyDot } from "@/components/bank-ui";
import { AddSession, SessionActions } from "@/components/bank-session-controls";

export const dynamic = "force-dynamic";

export default async function SkillPage({
  params, searchParams,
}: {
  params: Promise<{ subject: string; skill: string }>;
  searchParams: Promise<{ student?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!can(user.role, "bank.view")) redirect("/app");

  const { subject: subjectSlug, skill: skillSlug } = await params;
  const sp = await searchParams;
  const student = await resolveBankStudent(user, sp.student);
  const canManage = can(user.role, "bank.manage");

  const skill = await db.bankSkill.findFirst({
    where: { slug: skillSlug, domain: { subject: { slug: subjectSlug } } },
    include: {
      domain: { include: { subject: true } },
      sessions: {
        orderBy: { order: "asc" },
        include: { _count: { select: { questions: true } } },
      },
      _count: { select: { questions: true } },
    },
  });
  if (!skill) notFound();

  const stats = await statsBySession(skill.id, student?.id ?? null);
  const visible = canManage ? skill.sessions : skill.sessions.filter((s) => s.published);
  const unassigned = stats.get("__unassigned") ?? EMPTY;
  const overall = sumStats([...stats.values()]);

  const q = student ? `?student=${student.id}` : "";
  const base = `/app/bank/${subjectSlug}`;

  return (
    <>
      <Link href={`${base}${q}`} className="text-sm text-ink/50 hover:text-brand">
        ← {skill.domain.subject.name}
      </Link>

      <div className="mt-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-ink/40">{skill.domain.name}</p>
        <h1 className="mt-0.5 text-3xl font-extrabold">{skill.name}</h1>
        {skill.description && <p className="mt-1 max-w-2xl text-ink/60">{skill.description}</p>}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-black/10 bg-white px-5 py-4">
        <div>
          <p className="text-sm text-ink/55">Questions</p>
          <p className="text-2xl font-extrabold">{skill._count.questions}</p>
        </div>
        <div>
          <p className="text-sm text-ink/55">Sessions</p>
          <p className="text-2xl font-extrabold">{visible.length}</p>
        </div>
        {student && (
          <>
            <div>
              <p className="text-sm text-ink/55">Solved</p>
              <p className="text-2xl font-extrabold">
                {overall.attempted}
                <span className="text-base text-ink/30">/{overall.total}</span>
              </p>
            </div>
            <div>
              <p className="text-sm text-ink/55">Accuracy</p>
              <p className="text-2xl font-extrabold">
                {accuracy(overall) === null ? "–" : `${accuracy(overall)}%`}
              </p>
            </div>
          </>
        )}
        <Link
          href={`${base}/${skill.slug}/practice${q}`}
          aria-disabled={skill._count.questions === 0}
          className={`ml-auto rounded-full px-5 py-2 text-sm font-bold ${
            skill._count.questions > 0
              ? "bg-brand text-white hover:bg-brand-dark"
              : "pointer-events-none bg-black/10 text-ink/30"
          }`}
        >
          Practice this topic
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-extrabold">Sessions</h2>
        <p className="text-sm text-ink/50">
          What gets taught, in order. Each one has its own practice.
        </p>
      </div>

      <ol className="mt-3 space-y-2">
        {visible.map((s, i) => {
          const st = stats.get(s.id) ?? EMPTY;
          return (
            <li
              key={s.id}
              className={`rounded-2xl border border-black/10 bg-white p-4 ${s.published ? "" : "opacity-60"}`}
            >
              <div className="flex flex-wrap items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink text-sm font-bold text-white">
                  {s.order}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold">{s.title}</h3>
                    {!s.published && (
                      <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-bold text-ink/50">
                        hidden
                      </span>
                    )}
                  </div>
                  {s.objective && <p className="mt-0.5 text-sm text-ink/65">{s.objective}</p>}
                  {canManage && s.notes && (
                    <p className="mt-2 whitespace-pre-line rounded-lg bg-paper px-3 py-2 text-sm text-ink/70">
                      {s.notes}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                    <span className="text-ink/50">
                      {s._count.questions} question{s._count.questions === 1 ? "" : "s"}
                    </span>
                    {student && s._count.questions > 0 && (
                      <>
                        <span className="flex items-center gap-2">
                          <MiniBar value={st.attempted} max={st.total} />
                          <span className="text-ink/50">{st.attempted}/{st.total}</span>
                        </span>
                        <AccuracyDot value={accuracy(st)} />
                      </>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Link
                    href={`${base}/${skill.slug}/practice${q ? `${q}&` : "?"}session=${s.id}`}
                    aria-disabled={s._count.questions === 0}
                    className={`rounded-full px-4 py-1.5 text-sm font-bold ${
                      s._count.questions > 0
                        ? "bg-brand text-white hover:bg-brand-dark"
                        : "pointer-events-none bg-black/10 text-ink/30"
                    }`}
                  >
                    Practice
                  </Link>
                  {canManage && (
                    <SessionActions
                      id={s.id}
                      published={s.published}
                      canMoveUp={i > 0}
                      canMoveDown={i < visible.length - 1}
                    />
                  )}
                </div>
              </div>
            </li>
          );
        })}

        {!visible.length && (
          <li className="rounded-2xl border border-dashed border-black/15 bg-white px-4 py-10 text-center text-sm text-ink/40">
            No sessions yet.
            {canManage && " Add the first one below — it is what the student will work through."}
          </li>
        )}
      </ol>

      {canManage && (
        <div className="mt-3">
          <AddSession skillId={skill.id} nextOrder={skill.sessions.length + 1} />
        </div>
      )}

      {unassigned.total > 0 && (
        <p className="mt-4 rounded-xl bg-warn/10 px-4 py-3 text-sm text-ink/70">
          <strong>{unassigned.total}</strong> question
          {unassigned.total === 1 ? " is" : "s are"} in this topic but not attached to any session.
          They still appear in &ldquo;Practice this topic&rdquo;.
        </p>
      )}
    </>
  );
}
