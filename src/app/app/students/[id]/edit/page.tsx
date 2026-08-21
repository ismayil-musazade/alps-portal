import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { StudentEditForm } from "@/components/student-edit-form";

export const dynamic = "force-dynamic";

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user || !can(user.role, "students.edit")) redirect("/app");

  const { id } = await params;
  const s = await db.studentProfile.findUnique({ where: { id } });
  if (!s) notFound();

  const initial: Record<string, string> = {
    fullName: s.fullName, status: s.status,
    phone: s.phone ?? "", parentName: s.parentName ?? "", parentPhone: s.parentPhone ?? "",
    school: s.school ?? "", gradeLevel: s.gradeLevel ?? "", currentLevel: s.currentLevel ?? "",
    previousScores: s.previousScores ?? "", strengths: s.strengths ?? "",
    weaknesses: s.weaknesses ?? "", learningNotes: s.learningNotes ?? "",
  };

  return (
    <>
      <h1 className="text-2xl font-extrabold">Edit student — {s.fullName}</h1>
      <StudentEditForm studentId={s.id} initial={initial} />
    </>
  );
}
