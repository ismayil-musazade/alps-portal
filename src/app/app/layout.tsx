import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { AppNav } from "@/components/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <AppNav role={user.role} name={user.name} />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
