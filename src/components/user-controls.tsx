"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputCls } from "@/components/ui";

type Option = { id: string; name: string };

export function UserForm({ linkableStudents, allStudents }: { linkableStudents: Option[]; allStudents: Option[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("STAFF");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ name: string; tempPassword: string } | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = await fetch("/api/users", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      setCreated({ name: String(data.name), tempPassword: body.tempPassword });
      setOpen(false);
      router.refresh();
    } else setError(body.error ?? "Save failed");
    setBusy(false);
  }

  return (
    <div className="w-full">
      {created && (
        <div className="mb-3 rounded-xl border border-ok/30 bg-ok/5 p-4 text-sm">
          <p className="font-bold text-ok">Account created for {created.name}</p>
          <p className="mt-1">Temporary password (shown once — pass it on securely):</p>
          <code className="mt-1 inline-block rounded-lg bg-white px-3 py-1.5 font-mono text-base font-bold">{created.tempPassword}</code>
          <button onClick={() => setCreated(null)} className="ml-3 text-xs font-semibold text-ink/50 hover:text-ink">dismiss</button>
        </div>
      )}
      {!open ? (
        <button onClick={() => setOpen(true)} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">+ New account</button>
      ) : (
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 rounded-xl border border-black/10 bg-white p-4 md:grid-cols-4">
          <Field label="Full name *"><input name="name" required className={inputCls} /></Field>
          <Field label="Role">
            <select name="role" value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
              {["MANAGER","STAFF","TEACHER","STUDENT","PARENT"].map((r) => <option key={r} value={r}>{r.toLowerCase()}</option>)}
            </select>
          </Field>
          <Field label="Email"><input name="email" type="email" className={inputCls} /></Field>
          <Field label="Phone"><input name="phone" className={inputCls} placeholder="+994 __ ___ __ __" /></Field>
          {role === "STUDENT" && (
            <Field label="Link to student profile" className="md:col-span-2">
              <select name="linkStudentId" className={inputCls}>
                <option value="">— (no profile yet)</option>
                {linkableStudents.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
          )}
          {role === "PARENT" && (
            <Field label="Link to child" className="md:col-span-2">
              <select name="linkStudentId" className={inputCls}>
                <option value="">—</option>
                {allStudents.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
          )}
          {error && <p className="rounded-lg bg-brand-tint px-3 py-2 text-sm text-brand-dark md:col-span-4">{error}</p>}
          <div className="flex gap-2 md:col-span-4">
            <button disabled={busy} className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {busy ? "Creating…" : "Create account"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-black/15 px-4 py-2 text-sm font-semibold">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

export function UserRowActions({ userId, status }: { userId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [temp, setTemp] = useState("");

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (data.tempPassword) setTemp(data.tempPassword);
    router.refresh();
    setBusy(false);
  }

  return (
    <span className="flex items-center justify-end gap-1.5">
      {temp && <code className="rounded bg-ok/10 px-2 py-0.5 font-mono text-xs font-bold text-ok">{temp}</code>}
      <button
        onClick={() => patch({ resetPassword: true })}
        disabled={busy}
        className="rounded-full border border-black/15 px-2.5 py-1 text-xs font-semibold hover:bg-black/5 disabled:opacity-40"
      >
        reset pw
      </button>
      <button
        onClick={() => patch({ status: status === "ACTIVE" ? "DISABLED" : "ACTIVE" })}
        disabled={busy}
        className={`rounded-full px-2.5 py-1 text-xs font-bold disabled:opacity-40 ${status === "ACTIVE" ? "bg-risk/10 text-risk hover:bg-risk/20" : "bg-ok/10 text-ok hover:bg-ok/20"}`}
      >
        {status === "ACTIVE" ? "disable" : "enable"}
      </button>
    </span>
  );
}
