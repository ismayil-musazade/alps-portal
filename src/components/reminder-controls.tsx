"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputCls, inputBase } from "@/components/ui";

type Staff = { id: string; name: string };

/** Compact "set a reminder" form. Renders inline on a lead / student page. */
export function AddReminder({
  leadId,
  studentId,
  staff,
  defaultTitle = "",
}: {
  leadId?: string;
  studentId?: string;
  staff?: Staff[];
  defaultTitle?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [dueAt, setDueAt] = useState("");
  const [body, setBody] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, dueAt, body, leadId, studentId, assignedToId }),
    });
    if (res.ok) {
      setTitle("");
      setDueAt("");
      setBody("");
      setOpen(false);
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
        className="flex items-center gap-1.5 rounded-full border border-black/15 px-3 py-1.5 text-sm font-semibold hover:bg-black/5"
      >
        <BellIcon /> Set reminder
      </button>
    );
  }

  return (
    <form onSubmit={save} className="space-y-2 rounded-xl border border-brand/30 bg-brand-tint/40 p-3">
      <input
        autoFocus
        required
        placeholder="Remind me to…  (e.g. call about the trial lesson)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className={inputCls}
      />
      <div className="flex gap-2">
        <input
          required
          type="date"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          className={`${inputBase} min-w-0 flex-1`}
        />
        {staff && staff.length > 0 && (
          <select
            value={assignedToId}
            onChange={(e) => setAssignedToId(e.target.value)}
            className={`${inputBase} min-w-0 flex-1`}
          >
            <option value="">Me</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>
      <textarea
        rows={2}
        placeholder="Details (optional)"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className={inputCls}
      />
      {error && <p className="rounded-lg bg-white px-3 py-2 text-sm text-brand-dark">{error}</p>}
      <div className="flex gap-2">
        <button
          disabled={busy}
          className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save reminder"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-black/15 px-4 py-1.5 text-sm font-semibold hover:bg-black/5"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/** Done / delete buttons on a single reminder row. */
export function ReminderActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function patch(next: string) {
    setBusy(true);
    await fetch(`/api/reminders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    router.refresh();
    setBusy(false);
  }

  async function remove() {
    setBusy(true);
    await fetch(`/api/reminders/${id}`, { method: "DELETE" });
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      {status === "OPEN" ? (
        <button
          disabled={busy}
          onClick={() => patch("DONE")}
          title="Mark as done"
          className="rounded-full border border-ok/40 px-2.5 py-1 text-xs font-bold text-ok hover:bg-ok/10 disabled:opacity-40"
        >
          ✓ Done
        </button>
      ) : (
        <button
          disabled={busy}
          onClick={() => patch("OPEN")}
          title="Re-open"
          className="rounded-full border border-black/15 px-2.5 py-1 text-xs font-semibold text-ink/60 hover:bg-black/5 disabled:opacity-40"
        >
          Re-open
        </button>
      )}
      <button
        disabled={busy}
        onClick={remove}
        title="Delete reminder"
        className="rounded-full px-2 py-1 text-xs font-bold text-ink/30 hover:bg-risk/10 hover:text-risk disabled:opacity-40"
      >
        ✕
      </button>
    </div>
  );
}

export function BellIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}
