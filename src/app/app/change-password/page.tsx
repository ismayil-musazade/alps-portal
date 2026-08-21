import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { ChangePasswordForm } from "@/components/change-password-form";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const record = await db.user.findUnique({ where: { id: user.id }, select: { mustChangePassword: true } });

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-extrabold">Change password</h1>
      {record?.mustChangePassword && (
        <p className="mt-2 rounded-lg bg-warn/10 px-4 py-3 text-sm text-warn">
          You are using a temporary password. Please set your own password to continue.
        </p>
      )}
      <ChangePasswordForm forced={Boolean(record?.mustChangePassword)} />
    </div>
  );
}
