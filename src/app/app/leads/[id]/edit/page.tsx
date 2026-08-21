import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { LeadForm } from "@/components/lead-form";

export const dynamic = "force-dynamic";

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user || !can(user.role, "leads.edit")) redirect("/app");

  const { id } = await params;
  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) notFound();
  if (lead.status === "CONVERTED") redirect(`/app/leads/${id}`);

  const staffOptions = await db.user.findMany({
    where: { role: { in: ["STAFF", "MANAGER"] }, status: "ACTIVE" },
    select: { id: true, name: true },
  });

  const initial: Record<string, string> = {
    fullName: lead.fullName,
    phone: lead.phone,
    parentName: lead.parentName ?? "",
    parentPhone: lead.parentPhone ?? "",
    school: lead.school ?? "",
    gradeLevel: lead.gradeLevel ?? "",
    source: lead.source,
    interestedCourse: lead.interestedCourse ?? "",
    currentLevel: lead.currentLevel ?? "",
    targetScore: lead.targetScore ?? "",
    preferredSchedule: lead.preferredSchedule ?? "",
    groupPreference: lead.groupPreference ?? "",
    responsibleStaffId: lead.responsibleStaffId ?? "",
    nextFollowUpAt: lead.nextFollowUpAt?.toISOString().slice(0, 10) ?? "",
    lastContactNote: lead.lastContactNote ?? "",
  };

  return (
    <>
      <h1 className="text-2xl font-extrabold">Edit lead — {lead.fullName}</h1>
      <LeadForm staffOptions={staffOptions} initial={initial} leadId={lead.id} />
    </>
  );
}
