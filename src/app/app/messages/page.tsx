import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { listThreads, STAFF_ROLES } from "@/lib/messages";
import { formatDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!can(user.role, "messages.use")) redirect("/app");

  const threads = await listThreads(user.id);
  const talkedTo = new Set(threads.map((t) => t.userId));

  const colleagues = await db.user.findMany({
    where: { status: "ACTIVE", role: { in: [...STAFF_ROLES] }, id: { not: user.id } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <h1 className="text-2xl font-extrabold">Messages</h1>
      <p className="mt-1 text-sm text-ink/50">
        Talk directly to a colleague. For anything tied to a specific job, the
        conversation on that task keeps it in one place.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="space-y-2 lg:col-span-2">
          {threads.map((t) => (
            <Link
              key={t.userId}
              href={`/app/messages/${t.userId}`}
              className="flex items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 hover:border-brand/40"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{t.name}</span>
                  <span className="text-xs text-ink/40">{t.role.toLowerCase()}</span>
                  {t.unread > 0 && (
                    <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-white">
                      {t.unread} new
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-sm text-ink/60">
                  {t.outgoing ? "You: " : ""}
                  {t.lastBody}
                </p>
              </div>
              <span className="shrink-0 text-xs text-ink/40">{formatDateTime(t.lastAt)}</span>
            </Link>
          ))}
          {!threads.length && (
            <p className="rounded-xl border border-dashed border-black/15 bg-white px-4 py-10 text-center text-sm text-ink/40">
              No conversations yet. Pick someone on the right to start one.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-black/10 bg-white p-4">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink/50">Start a conversation</h3>
          <ul className="space-y-1">
            {colleagues
              .filter((c) => !talkedTo.has(c.id))
              .map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/app/messages/${c.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm hover:bg-black/5"
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-ink/40">{c.role.toLowerCase()}</span>
                  </Link>
                </li>
              ))}
            {colleagues.length === 0 && (
              <li className="py-2 text-sm text-ink/40">Nobody else is set up yet.</li>
            )}
          </ul>
        </div>
      </div>
    </>
  );
}
