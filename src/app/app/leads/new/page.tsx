import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { LeadForm } from "@/components/lead-form";

export const dynamic = "force-dynamic";

export default async function NewLeadPage() {
  const user = await currentUser();
  if (!user || !can(user.role, "leads.edit")) redirect("/app");

  const staffOptions = await db.user.findMany({
    where: { role: { in: ["STAFF", "MANAGER"] }, status: "ACTIVE" },
    select: { id: true, name: true },
  });

  return (
    <>
      <h1 className="text-2xl font-extrabold">New lead</h1>
      <LeadForm staffOptions={staffOptions} initial={{ responsibleStaffId: user.id }} />
    </>
  );
}
