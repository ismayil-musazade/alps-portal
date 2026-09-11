import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { loadPracticeSet, resolveBankStudent } from "@/lib/question-bank";
import { PracticeRunner } from "@/components/bank-practice";

export const dynamic = "force-dynamic";

/** Mixed practice across a whole subject. */
export default async function SubjectPracticePage({
  params, searchParams,
}: {
  params: Promise<{ subject: string }>;
  searchParams: Promise<{ student?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!can(user.role, "bank.view")) redirect("/app");

  const { subject } = await params;
  const sp = await searchParams;
  const student = await resolveBankStudent(user, sp.student);

  const record = await db.bankSubject.findUnique({ where: { slug: subject }, select: { name: true } });
  if (!record) notFound();

  const questions = await loadPracticeSet({
    subjectSlug: subject,
    studentId: student?.id ?? null,
    limit: 20,
  });
  if (!questions.length) notFound();

  const q = student ? `?student=${student.id}` : "";
  return (
    <PracticeRunner
      title={record.name}
      backHref={`/app/bank/${subject}${q}`}
      questions={questions}
      recording={user.role === "STUDENT"}
    />
  );
}
