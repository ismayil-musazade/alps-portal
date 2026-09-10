import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { ExamRunner, type RunnerQuestion } from "@/components/exam-runner";

export const dynamic = "force-dynamic";

/**
 * The manager walking through a paper as a candidate would see it.
 *
 * The answer key is deliberately not selected here: the page sends the same
 * shape of data to the same component a real sitting will use, so a preview
 * cannot accidentally be more revealing than the real thing.
 */
export default async function PreviewPaperPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!can(user.role, "tests.manage")) redirect("/app");

  const { id } = await params;
  const paper = await db.testPaper.findUnique({
    where: { id },
    select: {
      id: true, title: true, durationMin: true,
      questions: {
        orderBy: { order: "asc" },
        select: { id: true, order: true, section: true, passage: true, prompt: true, options: true },
      },
    },
  });
  if (!paper || !paper.questions.length) notFound();

  const questions: RunnerQuestion[] = paper.questions.map((q) => ({
    id: q.id,
    order: q.order,
    section: q.section,
    passage: q.passage,
    prompt: q.prompt,
    options: Array.isArray(q.options) ? (q.options as string[]) : [],
  }));

  return (
    <ExamRunner
      preview
      title={paper.title}
      durationMin={paper.durationMin}
      questions={questions}
      markUrl={`/api/exams/preview/${paper.id}/mark`}
      backHref="/app/exams"
    />
  );
}
