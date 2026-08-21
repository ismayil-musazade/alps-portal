import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { AppNav } from "@/components/nav";

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

  return (
    <div className="min-h-screen">
      <AppNav role={user.role} name={user.name} />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
