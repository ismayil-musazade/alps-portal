import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { SignOutButton, StartSitting } from "@/components/exam-seat-controls";

export const dynamic = "force-dynamic";

/**
 * What a candidate sees at an exam desk.
 *
 * Deliberately bare: no navigation, no links anywhere else. The desk login is
 * shared by strangers, so the only thing it can reach is the exam in front of
 * it.
 */
export default async function ExamDeskPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!can(user.role, "tests.take")) redirect("/app");

  const seat = await db.examSeat.findFirst({
    where: { userId: user.id },
    include: {
      sittings: {
        where: { status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { paper: { select: { title: true, durationMin: true } } },
      },
    },
  });

  const sitting = seat?.sittings[0];

  // nothing running here yet — offer whatever has been published
  const papers = sitting
    ? []
    : await db.testPaper.findMany({
        where: { status: "PUBLISHED", questions: { some: {} } },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, title: true, durationMin: true,
          _count: { select: { questions: true } },
        },
      });

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-8 text-center">
        <svg viewBox="0 0 100 100" className="mx-auto h-10 w-10" aria-hidden>
          <path fill="#b0322c" d="M44 6h12l40 88H70L52 54 40 78l8 2-16 14H4z" />
        </svg>
        <h1 className="mt-4 text-xl font-extrabold">{seat?.label ?? "Exam desk"}</h1>

        {sitting ? (
          <>
            <p className="mt-4 text-sm text-ink/60">Ready for</p>
            <p className="text-lg font-bold">{sitting.candidateName}</p>
            <p className="mt-1 text-sm text-ink/60">
              {sitting.paper.title} · {sitting.paper.durationMin} minutes
            </p>
            <a
              href={`/exam/sitting/${sitting.id}`}
              className="mt-6 inline-block w-full rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-dark"
            >
              Begin
            </a>
            <p className="mt-2 text-xs text-ink/45">
              The timer starts when you press this.
            </p>
          </>
        ) : (
          <StartSitting
            papers={papers.map((p) => ({
              id: p.id,
              title: p.title,
              durationMin: p.durationMin,
              questions: p._count.questions,
            }))}
          />
        )}

        <div className="mt-6">
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
