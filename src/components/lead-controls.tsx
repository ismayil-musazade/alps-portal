"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputCls, inputBase } from "@/components/ui";

const STATUSES = ["NEW","CONTACTED","PLACEMENT_BOOKED","PLACEMENT_DONE","TRIAL_BOOKED","INTERESTED","WAITING_DECISION","LOST"] as const;

/** Status + follow-up quick controls, and the add-activity box. */
export function LeadControls({
  leadId,
  status,
  nextFollowUpAt,
  followUpNote,
}: {
  leadId: string;
  status: string;
  nextFollowUpAt: string;
  followUpNote: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [newStatus, setNewStatus] = useState(status);
  const [followUp, setFollowUp] = useState(nextFollowUpAt);
  const [note, setNote] = useState(followUpNote);
  const [lostReason, setLostReason] = useState("");

  async function save() {
    setBusy(true);
    setError("");
    const body: Record<string, string> = {};
    if (newStatus !== status) body.status = newStatus;
    if (followUp !== nextFollowUpAt) body.nextFollowUpAt = followUp;
    if (note !== followUpNote) body.followUpNote = note;
    if (newStatus === "LOST" && lostReason) body.lostReason = lostReason;
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) router.refresh();
    else setError((await res.json().catch(() => ({}))).error ?? "Save failed");
    setBusy(false);
  }

  const dirty = newStatus !== status || followUp !== nextFollowUpAt || note !== followUpNote;

  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink/50">Update</h3>
      <label className="mb-1 block text-sm font-semibold">Status</label>
      <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className={inputCls}>
        {STATUSES.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ").toLowerCase()}</option>)}
      </select>
      {newStatus === "LOST" && (
        <input
          placeholder="Reason for not joining"
          value={lostReason}
          onChange={(e) => setLostReason(e.target.value)}
          className={`${inputCls} mt-2`}
        />
      )}
      <label className="mb-1 mt-3 block text-sm font-semibold">Next follow-up</label>
      <input
        type="datetime-local"
        value={followUp}
        onChange={(e) => setFollowUp(e.target.value)}
        className={inputCls}
      />
      <p className="mt-1 text-xs text-ink/40">
        Saving this puts a reminder on the bell of whoever is responsible for this lead.
      </p>
      <label className="mb-1 mt-2 block text-sm font-semibold">
        Why <span className="font-normal text-ink/40">— what this follow-up is for</span>
      </label>
      <textarea
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. Mother asked us to call back after the school exams to confirm the Saturday group."
        className={inputCls}
      />
      {error && <p className="mt-2 rounded-lg bg-brand-tint px-3 py-2 text-sm text-brand-dark">{error}</p>}
      <button
        onClick={save}
        disabled={busy || !dirty}
        className="mt-3 w-full rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-40"
      >
        {busy ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

export function ActivityBox({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [type, setType] = useState("NOTE");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/leads/${leadId}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, body }),
    });
    if (res.ok) {
      setBody("");
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <form onSubmit={add} className="flex gap-2">
      <select value={type} onChange={(e) => setType(e.target.value)} className={`${inputBase} w-28 shrink-0`}>
        <option value="NOTE">Note</option>
        <option value="CALL">Call</option>
        <option value="FOLLOW_UP">Follow-up</option>
      </select>
      <input
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What happened?"
        className={`${inputBase} min-w-0 flex-1`}
      />
      <button disabled={busy || !body.trim()} className="shrink-0 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-40">
        Add
      </button>
    </form>
  );
}
