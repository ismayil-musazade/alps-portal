"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Installs the demo placement paper so it can be previewed. */
export function AddDemoPaper({ label = "Add the demo paper" }: { label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function add() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/exams/demo-paper", { method: "POST" });
    if (res.ok) router.refresh();
    else setError((await res.json().catch(() => ({}))).error ?? "Could not add it");
    setBusy(false);
  }

  return (
    <span>
      <button
        onClick={add}
        disabled={busy}
        className="rounded-full border border-black/15 px-4 py-1.5 text-sm font-semibold hover:bg-black/5 disabled:opacity-40"
      >
        {busy ? "Adding…" : label}
      </button>
      {error && <span className="ml-2 text-sm text-brand-dark">{error}</span>}
    </span>
  );
}

/** Loads the five sample questions into the Question Bank. */
export function AddDemoBankQuestions() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function add() {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/bank/demo-questions", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg(data.added > 0 ? `Added ${data.added} questions.` : "Already loaded.");
      router.refresh();
    } else {
      setMsg(data.error ?? "Could not load them");
    }
    setBusy(false);
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <button
        onClick={add}
        disabled={busy}
        className="rounded-full border border-black/15 px-4 py-1.5 text-sm font-semibold hover:bg-black/5 disabled:opacity-40"
      >
        {busy ? "Loading…" : "Load 5 sample questions"}
      </button>
      {msg && <span className="text-sm text-ink/50">{msg}</span>}
    </span>
  );
}

/** Installs the 29 SAT skills. Safe to press twice. */
export function InstallCurriculum() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function install() {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/bank/install-curriculum", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg(`${data.skills} skills ready.`);
      router.refresh();
    } else {
      setMsg(data.error ?? "Could not install it");
    }
    setBusy(false);
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <button
        onClick={install}
        disabled={busy}
        className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-40"
      >
        {busy ? "Installing…" : "Install the SAT syllabus"}
      </button>
      {msg && <span className="text-sm text-ink/60">{msg}</span>}
    </span>
  );
}
