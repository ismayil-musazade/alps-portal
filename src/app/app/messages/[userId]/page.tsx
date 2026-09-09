import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { STAFF_ROLES } from "@/lib/messages";
import { formatDateTime } from "@/lib/time";
import { Composer, MarkThreadRead } from "@/components/message-controls";

export const dynamic = "force-dynamic";

export default async function ThreadPage({ params }: { params: Promise<{ userId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!can(user.role, "messages.use")) redirect("/app");

  const { userId } = await params;
  if (userId === user.id) redirect("/app/messages");

  const other = await db.user.findFirst({
    where: { id: userId, status: "ACTIVE", role: { in: [...STAFF_ROLES] } },
    select: { id: true, name: true, role: true },
  });
  if (!other) notFound();

  const messages = await db.message.findMany({
    where: {
      OR: [
        { senderId: user.id, recipientId: other.id },
        { senderId: other.id, recipientId: user.id },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 300,
  });

  const unread = messages.filter((m) => m.recipientId === user.id && !m.readAt).length;

  return (
    <>
      <MarkThreadRead withUserId={other.id} unread={unread} />

      <div className="flex flex-wrap items-center gap-3">
        <Link href="/app/messages" className="text-sm text-ink/50 hover:text-brand">← Messages</Link>
        <h1 className="text-2xl font-extrabold">{other.name}</h1>
        <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-bold text-ink/50">
          {other.role.toLowerCase()}
        </span>
      </div>

      <div className="mt-5 rounded-xl border border-black/10 bg-white p-4">
        <ul className="space-y-2">
          {messages.map((m) => {
            const mine = m.senderId === user.id;
            return (
              <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                    mine ? "bg-brand text-white" : "bg-paper text-ink"
                  }`}
                >
                  <p className="whitespace-pre-line">{m.body}</p>
                  <p className={`mt-0.5 text-xs ${mine ? "text-white/60" : "text-ink/40"}`}>
                    {formatDateTime(m.createdAt)}
                  </p>
                </div>
              </li>
            );
          })}
          {!messages.length && (
            <li className="py-6 text-center text-sm text-ink/40">
              Nothing here yet — say hello.
            </li>
          )}
        </ul>

        <Composer recipientId={other.id} recipientName={other.name} />
      </div>
    </>
  );
}
