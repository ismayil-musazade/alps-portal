import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { can, PERSON_ROLES } from "@/lib/permissions";
import { StatusBadge } from "@/components/ui";
import { UserForm, UserRowActions } from "@/components/user-controls";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await currentUser();
  if (!user || !can(user.role, "users.manage")) redirect("/app");

  const [users, linkableStudents, allStudents] = await Promise.all([
    db.user.findMany({
      // exam desks are furniture, not people — they live on their own page
      where: { role: { in: PERSON_ROLES } },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: { id: true, name: true, email: true, phone: true, role: true, status: true, mustChangePassword: true, createdAt: true },
    }),
    db.studentProfile.findMany({ where: { userId: null }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
    db.studentProfile.findMany({ select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Users &amp; Accounts</h1>
      </div>
      <div className="mt-4">
        <UserForm
          linkableStudents={linkableStudents.map((s) => ({ id: s.id, name: s.fullName }))}
          allStudents={allStudents.map((s) => ({ id: s.id, name: s.fullName }))}
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-black/10 bg-white">
        <table className="w-full min-w-165 text-sm">
          <thead className="bg-paper text-left">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Name</th>
              <th className="px-4 py-2.5 font-semibold">Role</th>
              <th className="px-4 py-2.5 font-semibold">Email / phone</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-black/5">
                <td className="px-4 py-2.5 font-semibold">
                  {u.name}
                  {u.mustChangePassword && <span className="ml-2 rounded-full bg-warn/10 px-2 py-0.5 text-xs font-bold text-warn" title="Has not set own password yet">temp pw</span>}
                </td>
                <td className="px-4 py-2.5"><StatusBadge value={u.role} tone={u.role === "MANAGER" ? "brand" : "muted"} /></td>
                <td className="px-4 py-2.5 text-ink/60">{[u.email, u.phone].filter(Boolean).join(" · ") || "—"}</td>
                <td className="px-4 py-2.5"><StatusBadge value={u.status} tone={u.status === "ACTIVE" ? "ok" : "risk"} /></td>
                <td className="px-4 py-2.5">
                  {u.id !== user.id ? <UserRowActions userId={u.id} status={u.status} /> : <span className="block text-right text-xs text-ink/40">you</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
