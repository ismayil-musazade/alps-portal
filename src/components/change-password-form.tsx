"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputCls } from "@/components/ui";

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newPassword = String(fd.get("newPassword"));
    if (newPassword !== String(fd.get("confirm"))) {
      setError("The two new passwords do not match");
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/change-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: String(fd.get("currentPassword")), newPassword }),
    });
    if (res.ok) {
      setDone(true);
      router.push("/app");
      router.refresh();
    } else {
      setError((await res.json().catch(() => ({}))).error ?? "Failed");
      setBusy(false);
    }
  }

  if (done) return <p className="mt-4 rounded-lg bg-ok/10 px-4 py-3 text-sm text-ok">Password updated.</p>;

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl border border-black/10 bg-white p-5">
      <Field label="Current password">
        <input name="currentPassword" type="password" required autoComplete="current-password" className={inputCls} />
      </Field>
      <Field label="New password (min 8 characters)">
        <input name="newPassword" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
      </Field>
      <Field label="Repeat new password">
        <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
      </Field>
      {error && <p className="rounded-lg bg-brand-tint px-3 py-2 text-sm text-brand-dark" role="alert">{error}</p>}
      <button disabled={busy} className="w-full rounded-full bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
        {busy ? "Saving…" : "Set new password"}
      </button>
      {!forced && (
        <p className="text-center text-xs text-ink/40">You will stay signed in on this device.</p>
      )}
    </form>
  );
}
