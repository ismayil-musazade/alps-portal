import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { StatusBadge } from "@/components/ui";
import { AddDemoPaper } from "@/components/demo-paper-button";

export const dynamic = "force-dynamic";

const PAPER_TONE: Record<string, "ok" | "warn" | "muted"> = {
  PUBLISHED: "ok",
  DRAFT: "warn",
  ARCHIVED: "muted",
};

export default async function ExamPapersPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!can(user.role, "tests.manage")) redirect("/app");

  const papers = await db.testPaper.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true, sittings: true } } },
  });

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">Placement papers</h1>
        <div className="ml-auto flex items-center gap-3">
          <AddDemoPaper label={papers.length ? "Refresh the demo paper" : "Add the demo paper"} />
          <Link href="/app/exam-seats" className="text-sm font-semibold text-ink/50 hover:text-brand">
            Exam desks →
          </Link>
        </div>
      </div>
      <p className="mt-1 max-w-2xl text-sm text-ink/60">
        Open a paper to walk through it exactly as a candidate would — same screen, same
        timer, same marking. Nothing you do in a preview is recorded.
      </p>

      <div className="mt-5 space-y-2">
        {papers.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{p.title}</span>
                <StatusBadge value={p.status} tone={PAPER_TONE[p.status]} />
              </div>
              <p className="mt-0.5 text-sm text-ink/50">
                {p._count.questions} question{p._count.questions === 1 ? "" : "s"} ·{" "}
                {p.durationMin} minutes
                {p.passScore !== null && ` · pass mark ${p.passScore}`}
                {p._count.sittings > 0 && ` · ${p._count.sittings} sat so far`}
              </p>
            </div>
            <Link
              href={`/exam/preview/${p.id}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Preview as a candidate
            </Link>
          </div>
        ))}
        {!papers.length && (
          <div className="rounded-xl border border-dashed border-black/15 bg-white px-4 py-10 text-center">
            <p className="text-sm text-ink/40">No papers yet.</p>
            <div className="mt-3">
              <AddDemoPaper />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
