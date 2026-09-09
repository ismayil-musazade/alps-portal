"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputCls, inputBase } from "@/components/ui";

export const CATEGORIES = [
  ["OLYMPIAD", "Olympiad"],
  ["EXAM", "Exam result"],
  ["CERTIFICATE", "Certificate"],
  ["COMPETITION", "Competition"],
  ["AWARD", "Award"],
  ["OTHER", "Other"],
] as const;

/** Record an olympiad placing, a certificate, a prior exam score. */
export function AddAchievement({ leadId, studentId }: { leadId?: string; studentId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("OLYMPIAD");
  const [result, setResult] = useState("");
  const [achievedOn, setAchievedOn] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/achievements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, category, result, achievedOn, note, leadId, studentId }),
    });
    if (res.ok) {
      setTitle(""); setResult(""); setAchievedOn(""); setNote(""); setOpen(false);
      router.refresh();
    } else {
      setError((await res.json().catch(() => ({}))).error ?? "Could not save");
    }
    setBusy(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-black/15 px-3 py-1.5 text-sm font-semibold hover:bg-black/5"
      >
        + Add
      </button>
    );
  }

  return (
    <form onSubmit={save} className="mt-2 space-y-2 rounded-xl border border-brand/30 bg-brand-tint/40 p-3">
      <input
        autoFocus required maxLength={200}
        placeholder="What was it?  (e.g. Republic Mathematics Olympiad)"
        value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls}
      />
      <div className="flex flex-wrap gap-2">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputBase} min-w-0 flex-1`}>
          {CATEGORIES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <input
          placeholder="Result (2nd place, IELTS 7.5)"
          value={result} onChange={(e) => setResult(e.target.value)}
          className={`${inputBase} min-w-0 flex-1`}
        />
        <input
          type="date" value={achievedOn} onChange={(e) => setAchievedOn(e.target.value)}
          title="When" className={`${inputBase} min-w-0 flex-1`}
        />
      </div>
      <textarea
        rows={2} placeholder="Anything worth remembering (optional)"
        value={note} onChange={(e) => setNote(e.target.value)} className={inputCls}
      />
      {error && <p className="rounded-lg bg-white px-3 py-2 text-sm text-brand-dark">{error}</p>}
      <div className="flex gap-2">
        <button disabled={busy} className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-40">
          {busy ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-black/15 px-4 py-1.5 text-sm font-semibold hover:bg-black/5">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function DeleteAchievement({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function remove() {
    setBusy(true);
    await fetch(`/api/achievements/${id}`, { method: "DELETE" });
    router.refresh();
    setBusy(false);
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)} title="Remove"
        className="shrink-0 rounded-full px-2 py-1 text-xs font-bold text-ink/30 hover:bg-risk/10 hover:text-risk"
      >
        ✕
      </button>
    );
  }
  return (
    <span className="flex shrink-0 items-center gap-1">
      <button disabled={busy} onClick={remove} className="rounded-full bg-risk px-2.5 py-1 text-xs font-bold text-white disabled:opacity-40">
        Remove
      </button>
      <button onClick={() => setConfirming(false)} className="rounded-full px-2 py-1 text-xs font-semibold text-ink/50 hover:bg-black/5">
        No
      </button>
    </span>
  );
}
