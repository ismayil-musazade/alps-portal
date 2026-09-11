import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { loadPracticeSet, resolveBankStudent } from "@/lib/question-bank";
import { PracticeRunner } from "@/components/bank-practice";

export const dynamic = "force-dynamic";

/** One topic, or one session inside it. */
export default async function SkillPracticePage({
  params, searchParams,
}: {
  params: Promise<{ subject: string; skill: string }>;
  searchParams: Promise<{ student?: string; session?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!can(user.role, "bank.view")) redirect("/app");

  const { subject, skill } = await params;
  const sp = await searchParams;
  const student = await resolveBankStudent(user, sp.student);

  const record = await db.bankSkill.findFirst({
    where: { slug: skill, domain: { subject: { slug: subject } } },
    select: { name: true },
  });
  if (!record) notFound();

  const session = sp.session
    ? await db.bankSession.findUnique({ where: { id: sp.session }, select: { id: true, title: true, order: true } })
    : null;

  const questions = await loadPracticeSet({
    subjectSlug: subject,
    skillSlug: skill,
    sessionId: session?.id,
    studentId: student?.id ?? null,
  });
  if (!questions.length) notFound();

  const q = student ? `?student=${student.id}` : "";
  return (
    <PracticeRunner
      title={session ? `Session ${session.order}: ${session.title}` : record.name}
      backHref={`/app/bank/${subject}/${skill}${q}`}
      questions={questions}
      recording={user.role === "STUDENT"}
    />
  );
}
