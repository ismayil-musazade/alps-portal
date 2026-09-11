"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputCls } from "@/components/ui";

/** Teacher: add a session to a skill. */
export function AddSession({ skillId, nextOrder }: { skillId: string; nextOrder: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/bank/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skillId, title, objective, notes }),
    });
    if (res.ok) {
      setTitle(""); setObjective(""); setNotes(""); setOpen(false);
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
        className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        + Add session {nextOrder}
      </button>
    );
  }

  return (
    <form onSubmit={save} className="mt-3 space-y-2 rounded-xl border border-brand/30 bg-brand-tint/40 p-4">
      <input
        autoFocus required maxLength={160}
        placeholder="What is this session called?  (e.g. Solving for x with fractions)"
        value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls}
      />
      <input
        maxLength={500}
        placeholder="By the end of this session the student can… (optional)"
        value={objective} onChange={(e) => setObjective(e.target.value)} className={inputCls}
      />
      <textarea
        rows={3} placeholder="Teaching notes — what you cover, worked examples, common mistakes (optional)"
        value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls}
      />
      {error && <p className="rounded-lg bg-white px-3 py-2 text-sm text-brand-dark">{error}</p>}
      <div className="flex gap-2">
        <button disabled={busy} className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-40">
          {busy ? "Saving…" : "Add session"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-black/15 px-4 py-1.5 text-sm font-semibold hover:bg-black/5">
          Cancel
        </button>
      </div>
    </form>
  );
}

/** Reorder, hide or remove one session. */
export function SessionActions({
  id, published, canMoveUp, canMoveDown,
}: {
  id: string; published: boolean; canMoveUp: boolean; canMoveDown: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    await fetch(`/api/bank/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    router.refresh();
    setBusy(false);
  }

  async function remove() {
    setBusy(true);
    const res = await fetch(`/api/bank/sessions/${id}`, { method: "DELETE" });
    if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? "Could not remove");
    else router.refresh();
    setConfirming(false);
    setBusy(false);
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
      {error && <span className="mr-2 text-xs font-semibold text-risk">{error}</span>}
      <button
        disabled={busy || !canMoveUp} onClick={() => patch({ move: "up" })}
        title="Move earlier" aria-label="Move earlier"
        className="rounded-full px-2 py-1 text-xs font-bold text-ink/40 hover:bg-black/5 disabled:opacity-20"
      >
        ↑
      </button>
      <button
        disabled={busy || !canMoveDown} onClick={() => patch({ move: "down" })}
        title="Move later" aria-label="Move later"
        className="rounded-full px-2 py-1 text-xs font-bold text-ink/40 hover:bg-black/5 disabled:opacity-20"
      >
        ↓
      </button>
      <button
        disabled={busy} onClick={() => patch({ published: !published })}
        className="rounded-full border border-black/15 px-2.5 py-1 text-xs font-semibold hover:bg-black/5 disabled:opacity-40"
      >
        {published ? "Hide" : "Show"}
      </button>
      {confirming ? (
        <>
          <button disabled={busy} onClick={remove} className="rounded-full bg-risk px-2.5 py-1 text-xs font-bold text-white disabled:opacity-40">
            Remove
          </button>
          <button onClick={() => setConfirming(false)} className="rounded-full px-2 py-1 text-xs font-semibold text-ink/50 hover:bg-black/5">
            No
          </button>
        </>
      ) : (
        <button
          onClick={() => setConfirming(true)} title="Remove session"
          className="rounded-full px-2 py-1 text-xs font-bold text-ink/30 hover:bg-risk/10 hover:text-risk"
        >
          ✕
        </button>
      )}
    </div>
  );
}
