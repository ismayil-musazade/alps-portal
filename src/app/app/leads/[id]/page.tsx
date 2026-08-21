import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { StatusBadge, LEAD_STATUS_TONE } from "@/components/ui";
import { LeadControls, ActivityBox } from "@/components/lead-controls";
import { ConvertButton } from "@/components/student-controls";

export const dynamic = "force-dynamic";

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 border-b border-dashed border-black/5 py-1.5 text-sm last:border-0">
      <span className="text-ink/50">{label}</span>
      <span className="text-right font-medium">{value || "—"}</span>
    </div>
  );
}

export default async function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user || !can(user.role, "leads.view")) redirect("/app");

  const { id } = await params;
  const lead = await db.lead.findUnique({
    where: { id },
    include: {
      responsibleStaff: { select: { name: true } },
      activities: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      studentProfile: { select: { id: true } },
    },
  });
  if (!lead) notFound();

  const canEdit = can(user.role, "leads.edit") && lead.status !== "CONVERTED";

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/app/leads" className="text-sm text-ink/50 hover:text-brand">← Leads</Link>
        <h1 className="text-2xl font-extrabold">{lead.fullName}</h1>
        <StatusBadge value={lead.status} tone={LEAD_STATUS_TONE[lead.status]} />
        {canEdit && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {can(user.role, "students.edit") && lead.status !== "LOST" && <ConvertButton leadId={lead.id} />}
            <Link href={`/app/leads/${lead.id}/edit`} className="rounded-full border border-black/15 px-4 py-1.5 text-sm font-semibold hover:bg-black/5">
              Edit details
            </Link>
          </div>
        )}
        {lead.studentProfile && (
          <Link href={`/app/students/${lead.studentProfile.id}`} className="ml-auto rounded-full bg-ok/10 px-4 py-1.5 text-sm font-bold text-ok">
            View student profile →
          </Link>
        )}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-black/10 bg-white p-4">
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink/50">Contact</h3>
              <Row label="Phone" value={lead.phone} />
              <Row label="Parent" value={lead.parentName} />
              <Row label="Parent phone" value={lead.parentPhone} />
              <Row label="School" value={lead.school} />
              <Row label="Grade" value={lead.gradeLevel} />
              <Row label="Source" value={lead.source.replaceAll("_", " ").toLowerCase()} />
            </div>
            <div className="rounded-xl border border-black/10 bg-white p-4">
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink/50">Academic interest</h3>
              <Row label="Course" value={lead.interestedCourse?.replaceAll("_", " ")} />
              <Row label="Current level" value={lead.currentLevel} />
              <Row label="Target" value={lead.targetScore} />
              <Row label="Schedule" value={lead.preferredSchedule} />
              <Row label="Preference" value={lead.groupPreference} />
              <Row label="Staff" value={lead.responsibleStaff?.name} />
              {lead.status === "LOST" && <Row label="Lost reason" value={lead.lostReason} />}
            </div>
          </div>

          <div className="rounded-xl border border-black/10 bg-white p-4">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink/50">Activity</h3>
            {canEdit && <ActivityBox leadId={lead.id} />}
            <ul className="mt-3 space-y-2">
              {lead.activities.map((a) => (
                <li key={a.id} className="rounded-lg bg-paper px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{a.author.name}</span>
                    <span className="text-xs text-ink/40">
                      {a.type.replaceAll("_", " ").toLowerCase()} · {a.createdAt.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>
                  <p className="mt-0.5 text-ink/80">{a.body}</p>
                </li>
              ))}
              {!lead.activities.length && <li className="py-4 text-center text-sm text-ink/40">No activity yet.</li>}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          {canEdit && (
            <LeadControls
              leadId={lead.id}
              status={lead.status}
              nextFollowUpAt={lead.nextFollowUpAt?.toISOString().slice(0, 10) ?? ""}
            />
          )}
          <div className="rounded-xl border border-black/10 bg-white p-4 text-sm">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink/50">Timeline</h3>
            <Row label="Created" value={lead.createdAt.toLocaleDateString("en-GB")} />
            <Row label="First contact" value={lead.firstContactAt?.toLocaleDateString("en-GB")} />
            <Row label="Next follow-up" value={lead.nextFollowUpAt?.toLocaleDateString("en-GB")} />
          </div>
        </div>
      </div>
    </>
  );
}
