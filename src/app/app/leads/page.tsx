import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { StatusBadge, LEAD_STATUS_TONE, inputCls } from "@/components/ui";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUSES = ["NEW","CONTACTED","PLACEMENT_BOOKED","PLACEMENT_DONE","TRIAL_BOOKED","INTERESTED","WAITING_DECISION","CONVERTED","LOST"] as const;
const SOURCES = ["INSTAGRAM","WHATSAPP","REFERRAL","WALK_IN","PHONE_CALL","WEBSITE","OTHER"] as const;

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await currentUser();
  if (!user || !can(user.role, "leads.view")) redirect("/app");

  const sp = await searchParams;
  const q = sp.q?.trim();
  const status = sp.status;
  const source = sp.source;
  const staff = sp.staff;
  const due = sp.due === "1";

  const where: Prisma.LeadWhereInput = {
    ...(q ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {}),
    ...(status ? { status: status as never } : {}),
    ...(source ? { source: source as never } : {}),
    ...(staff ? { responsibleStaffId: staff } : {}),
    ...(due ? { nextFollowUpAt: { lte: new Date() }, status: { notIn: ["CONVERTED", "LOST"] } } : {}),
  };

  const [leads, staffUsers] = await Promise.all([
    db.lead.findMany({
      where,
      orderBy: [{ nextFollowUpAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
      include: { responsibleStaff: { select: { name: true } } },
      take: 200,
    }),
    db.user.findMany({ where: { role: { in: ["STAFF", "MANAGER"] }, status: "ACTIVE" }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">CRM / Leads</h1>
        <Link href="/app/leads/new" className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          + New lead
        </Link>
      </div>

      <form className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-6" method="get">
        <input name="q" defaultValue={q ?? ""} placeholder="Search name / phone" className={`${inputCls} col-span-2`} />
        <select name="status" defaultValue={status ?? ""} className={inputCls}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ").toLowerCase()}</option>)}
        </select>
        <select name="source" defaultValue={source ?? ""} className={inputCls}>
          <option value="">All sources</option>
          {SOURCES.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ").toLowerCase()}</option>)}
        </select>
        <select name="staff" defaultValue={staff ?? ""} className={inputCls}>
          <option value="">All staff</option>
          {staffUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-semibold hover:bg-black/5">Filter</button>
          <Link
            href="/app/leads?due=1"
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${due ? "bg-brand-tint text-brand-dark" : "border border-black/15 bg-white hover:bg-black/5"}`}
          >
            Due now
          </Link>
        </div>
      </form>

      <div className="mt-4 overflow-x-auto rounded-xl border border-black/10 bg-white">
        <table className="w-full min-w-175 text-sm">
          <thead className="bg-paper text-left">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Name</th>
              <th className="px-4 py-2.5 font-semibold">Phone</th>
              <th className="px-4 py-2.5 font-semibold">Course</th>
              <th className="px-4 py-2.5 font-semibold">Source</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 font-semibold">Follow-up</th>
              <th className="px-4 py-2.5 font-semibold">Staff</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => {
              const overdue = l.nextFollowUpAt && l.nextFollowUpAt <= new Date() && !["CONVERTED", "LOST"].includes(l.status);
              return (
                <tr key={l.id} className="border-t border-black/5 hover:bg-paper/60">
                  <td className="px-4 py-2.5">
                    <Link href={`/app/leads/${l.id}`} className="font-semibold text-ink hover:text-brand">{l.fullName}</Link>
                  </td>
                  <td className="px-4 py-2.5">{l.phone}</td>
                  <td className="px-4 py-2.5">{l.interestedCourse?.replaceAll("_", " ") ?? "—"}</td>
                  <td className="px-4 py-2.5 text-ink/60">{l.source.replaceAll("_", " ").toLowerCase()}</td>
                  <td className="px-4 py-2.5"><StatusBadge value={l.status} tone={LEAD_STATUS_TONE[l.status]} /></td>
                  <td className={`px-4 py-2.5 ${overdue ? "text-risk" : ""}`}>
                    <span className={overdue ? "font-bold" : ""}>
                      {l.nextFollowUpAt?.toLocaleDateString("en-GB") ?? "—"}
                    </span>
                    {l.followUpNote && (
                      <span
                        title={l.followUpNote}
                        className="mt-0.5 block max-w-[16rem] truncate text-xs font-normal text-ink/45"
                      >
                        {l.followUpNote}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-ink/60">{l.responsibleStaff?.name ?? "—"}</td>
                </tr>
              );
            })}
            {!leads.length && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-ink/40">No leads match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink/40">{leads.length} lead(s)</p>
    </>
  );
}
