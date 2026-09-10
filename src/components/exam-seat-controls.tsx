"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Issued = { seatNo: number; login: string; password: string };

/** Passwords are shown once and never stored in readable form. */
function PasswordList({ issued, onDone }: { issued: Issued[]; onDone: () => void }) {
  return (
    <div className="mt-3 rounded-xl border border-warn/40 bg-warn/5 p-4">
      <p className="text-sm font-bold text-ink">
        Write these down now — they are shown once and cannot be recovered.
      </p>
      <ul className="mt-2 space-y-1.5">
        {issued.map((s) => (
          <li key={s.seatNo} className="flex flex-wrap items-center gap-3 text-sm">
            <span className="w-24 font-semibold">Desk {s.seatNo}</span>
            <code className="rounded bg-white px-2 py-1 font-mono font-bold">{s.login}</code>
            <code className="rounded bg-white px-2 py-1 font-mono text-base font-bold">{s.password}</code>
          </li>
        ))}
      </ul>
      <button
        onClick={onDone}
        className="mt-3 rounded-full border border-black/15 bg-white px-4 py-1.5 text-sm font-semibold hover:bg-black/5"
      >
        I have written them down
      </button>
    </div>
  );
}

/** Create whichever of the five desks are missing. */
export function CreateSeats({ missing }: { missing: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [issued, setIssued] = useState<Issued[] | null>(null);

  async function create() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/exam-seats", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setIssued(data.created ?? []);
    else setError(data.error ?? "Could not create the desks");
    setBusy(false);
  }

  if (issued) {
    return <PasswordList issued={issued} onDone={() => { setIssued(null); router.refresh(); }} />;
  }

  return (
    <div>
      <button
        onClick={create}
        disabled={busy}
        className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-40"
      >
        {busy ? "Creating…" : `Create ${missing} exam desk${missing === 1 ? "" : "s"}`}
      </button>
      {error && <p className="mt-2 rounded-lg bg-brand-tint px-3 py-2 text-sm text-brand-dark">{error}</p>}
    </div>
  );
}

/** Give one desk a fresh password. */
export function ResetSeatPassword({ seatNo, busy: inUse }: { seatNo: number; busy: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [issued, setIssued] = useState<Issued[] | null>(null);

  async function reset() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/exam-seats/${seatNo}/reset`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setIssued([{ seatNo, login: data.login, password: data.password }]);
    else setError(data.error ?? "Could not reset");
    setBusy(false);
  }

  if (issued) {
    return <PasswordList issued={issued} onDone={() => { setIssued(null); router.refresh(); }} />;
  }

  return (
    <span className="flex flex-wrap items-center justify-end gap-2">
      {error && <span className="text-xs font-semibold text-risk">{error}</span>}
      <button
        onClick={reset}
        disabled={busy || inUse}
        title={inUse ? "Somebody is sitting an exam at this desk" : "Issue a new password"}
        className="rounded-full border border-black/15 px-3 py-1 text-xs font-semibold hover:bg-black/5 disabled:opacity-30"
      >
        {busy ? "…" : "New password"}
      </button>
    </span>
  );
}

/** The only way off the exam desk screen. */
export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
      className="rounded-full border border-black/15 px-4 py-1.5 text-sm font-semibold hover:bg-black/5"
    >
      Sign out
    </button>
  );
}
