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
