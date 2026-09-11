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

/** Start an exam at this desk: pick the paper, type who is sitting it. */
export function StartSitting({
  papers,
}: {
  papers: { id: string; title: string; durationMin: number; questions: number }[];
}) {
  const router = useRouter();
  const [paperId, setPaperId] = useState(papers[0]?.id ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/exam-sittings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paperId, candidateName: name, candidatePhone: phone }),
    });
    if (res.ok) router.refresh();
    else setError((await res.json().catch(() => ({}))).error ?? "Could not start");
    setBusy(false);
  }

  if (!papers.length) {
    return (
      <p className="mt-4 text-sm text-ink/60">
        No exam has been published yet. Ask the front desk to set one up.
      </p>
    );
  }

  const field =
    "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

  return (
    <form onSubmit={start} className="mt-5 space-y-2 text-left">
      <label className="block text-sm font-semibold">Which exam</label>
      <select value={paperId} onChange={(e) => setPaperId(e.target.value)} className={field}>
        {papers.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title} — {p.questions} questions, {p.durationMin} min
          </option>
        ))}
      </select>

      <label className="block pt-1 text-sm font-semibold">Your full name</label>
      <input
        required autoFocus value={name} onChange={(e) => setName(e.target.value)}
        placeholder="As it should appear on your result" className={field}
      />

      <label className="block pt-1 text-sm font-semibold">
        Phone <span className="font-normal text-ink/40">— so we can match your record</span>
      </label>
      <input
        value={phone} onChange={(e) => setPhone(e.target.value)}
        placeholder="+994…" className={field}
      />

      {error && <p className="rounded-lg bg-brand-tint px-3 py-2 text-sm text-brand-dark">{error}</p>}

      <button
        disabled={busy || name.trim().length < 2}
        className="mt-2 w-full rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-40"
      >
        {busy ? "Starting…" : "Start the exam"}
      </button>
    </form>
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
