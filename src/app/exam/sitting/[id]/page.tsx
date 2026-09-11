import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { ExamRunner, type RunnerQuestion } from "@/components/exam-runner";

export const dynamic = "force-dynamic";

/** A real placement sitting, at the desk it was started on. */
export default async function SittingPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!can(user.role, "tests.take")) redirect("/app");

  const { id } = await params;
  const sitting = await db.testSitting.findFirst({
    where: { id, seat: { userId: user.id } },
    include: {
      paper: {
        select: {
          id: true, title: true, durationMin: true,
          questions: {
            orderBy: { order: "asc" },
            select: { id: true, order: true, section: true, passage: true, prompt: true, options: true },
          },
        },
      },
    },
  });
  if (!sitting || !sitting.paper.questions.length) notFound();
  if (sitting.status === "GRADED" || sitting.status === "CANCELLED") redirect("/exam");

  if (sitting.status === "ASSIGNED") {
    await db.testSitting.update({
      where: { id: sitting.id },
      data: { status: "IN_PROGRESS", startedAt: new Date() },
    });
  }

  const questions: RunnerQuestion[] = sitting.paper.questions.map((q) => ({
    id: q.id,
    order: q.order,
    section: q.section,
    passage: q.passage,
    prompt: q.prompt,
    options: Array.isArray(q.options) ? (q.options as string[]) : [],
  }));

  return (
    <ExamRunner
      title={sitting.paper.title}
      durationMin={sitting.paper.durationMin}
      questions={questions}
      markUrl={`/api/exam-sittings/${sitting.id}/submit`}
      candidateName={sitting.candidateName}
    />
  );
}
