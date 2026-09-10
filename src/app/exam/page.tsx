import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { SignOutButton } from "@/components/exam-seat-controls";

export const dynamic = "force-dynamic";

/**
 * What a candidate sees at an exam desk.
 *
 * Deliberately bare: no navigation, no links anywhere else. The desk login is
 * shared by strangers, so the only thing it can reach is the exam in front of
 * it. Sitting the paper itself is built next.
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

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-8 text-center">
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
            <p className="mt-6 rounded-xl bg-brand-tint px-4 py-3 text-sm text-brand-dark">
              The exam screen is being built. Nothing is lost — this sitting stays here.
            </p>
          </>
        ) : (
          <p className="mt-4 text-sm text-ink/60">
            No exam has been set up at this desk yet. Ask the front desk to create one.
          </p>
        )}

        <div className="mt-6">
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
