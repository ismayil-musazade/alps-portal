import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { AppNav } from "@/components/nav";
import { can, APP_ROLES } from "@/lib/permissions";
import { dueReminderCount } from "@/lib/reminders";
import { unreadMessageCount } from "@/lib/messages";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");

  // accounts still on a temporary password can only reach the change-password screen
  const record = await db.user.findUnique({
    where: { id: user.id },
    select: { mustChangePassword: true, status: true },
  });
  if (!record || record.status !== "ACTIVE") redirect("/login");

  // a shared exam desk has no business in the app shell
  if (!APP_ROLES.includes(user.role)) redirect("/exam");

  const showBell = can(user.role, "reminders.use");
  const showInbox = can(user.role, "messages.use");
  const [dueCount, unreadCount] = await Promise.all([
    showBell ? dueReminderCount(user.id) : 0,
    showInbox ? unreadMessageCount(user.id) : 0,
  ]);

  return (
    <div className="min-h-screen">
      <AppNav
        role={user.role}
        name={user.name}
        dueCount={dueCount}
        showBell={showBell}
        unreadCount={unreadCount}
        showInbox={showInbox}
      />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
