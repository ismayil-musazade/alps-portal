"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { inputCls, inputBase } from "@/components/ui";

type Staff = { id: string; name: string; role: string };

/** Manager: assign a new task. */
export function NewTaskForm({ staff }: { staff: Staff[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [assignedToId, setAssignedToId] = useState(staff[0]?.id ?? "");
  const [dueAt, setDueAt] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/staff-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, assignedToId, dueAt, description }),
    });
    if (res.ok) {
      setTitle(""); setDueAt(""); setDescription(""); setOpen(false);
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
        + New task
      </button>
    );
  }

  return (
    <form onSubmit={save} className="w-full space-y-2 rounded-xl border border-brand/30 bg-brand-tint/40 p-4">
      <input
        autoFocus required placeholder="What needs doing?"
        value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls}
      />
      <div className="flex flex-wrap gap-2">
        <select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)} className={`${inputBase} min-w-0 flex-1`}>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>{s.name} · {s.role.toLowerCase()}</option>
          ))}
        </select>
        <input
          type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)}
          className={`${inputBase} min-w-0 flex-1`} title="Deadline"
        />
      </div>
      <textarea
        rows={3} placeholder="Details, context, what 'done' looks like (optional)"
        value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls}
      />
      {error && <p className="rounded-lg bg-white px-3 py-2 text-sm text-brand-dark">{error}</p>}
      <div className="flex gap-2">
        <button disabled={busy} className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-40">
          {busy ? "Assigning…" : "Assign task"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-black/15 px-4 py-1.5 text-sm font-semibold hover:bg-black/5">
          Cancel
        </button>
      </div>
    </form>
  );
}

/** Move a task between statuses. Options are decided server-side by role. */
export function StatusPicker({ taskId, status, options }: { taskId: string; status: string; options: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function set(next: string) {
    if (next === status) return;
    setBusy(true);
    await fetch(`/api/staff-tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    router.refresh();
    setBusy(false);
  }

  if (!options.length) return null;
  return (
    <select
      value={status} disabled={busy} onChange={(e) => set(e.target.value)}
      className={`${inputBase} w-44`} aria-label="Task status"
    >
      {options.map((o) => (
        <option key={o} value={o}>{o.replaceAll("_", " ").toLowerCase()}</option>
      ))}
    </select>
  );
}

/** Upload a file against the task. */
export function FileUpload({ taskId, maxLabel }: { taskId: string; maxLabel: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(file: File) {
    setBusy(true);
    setError("");
    const body = new FormData();
    body.append("file", file);
    const res = await fetch(`/api/staff-tasks/${taskId}/files`, { method: "POST", body });
    if (res.ok) router.refresh();
    else setError((await res.json().catch(() => ({}))).error ?? "Upload failed");
    if (inputRef.current) inputRef.current.value = "";
    setBusy(false);
  }

  return (
    <div>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-black/15 px-4 py-1.5 text-sm font-semibold hover:bg-black/5">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 16V4m0 0L7 9m5-5 5 5" />
          <path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
        </svg>
        {busy ? "Uploading…" : "Upload file"}
        <input
          ref={inputRef} type="file" className="hidden" disabled={busy}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) send(f); }}
        />
      </label>
      <p className="mt-1 text-xs text-ink/40">Documents, spreadsheets, PDFs or images, up to {maxLabel} each.</p>
      {error && <p className="mt-1 rounded-lg bg-brand-tint px-3 py-2 text-sm text-brand-dark">{error}</p>}
    </div>
  );
}

/** Manager: approve a file or send it back, with a note. */
export function FileReview({ fileId, status, reviewNote }: { fileId: string; status: string; reviewNote: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(reviewNote ?? "");
  const [asking, setAsking] = useState(false);

  async function decide(next: "APPROVED" | "REJECTED" | "PENDING") {
    setBusy(true);
    await fetch(`/api/staff-tasks/files/${fileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next, reviewNote: note }),
    });
    setAsking(false);
    router.refresh();
    setBusy(false);
  }

  if (asking) {
    return (
      <div className="mt-2 space-y-2 rounded-lg border border-black/10 bg-white p-2">
        <textarea
          autoFocus rows={2} value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="What needs changing?" className={inputCls}
        />
        <div className="flex gap-2">
          <button disabled={busy} onClick={() => decide("REJECTED")} className="rounded-full bg-risk px-3 py-1 text-xs font-bold text-white disabled:opacity-40">
            Send back
          </button>
          <button type="button" onClick={() => setAsking(false)} className="rounded-full border border-black/15 px-3 py-1 text-xs font-semibold hover:bg-black/5">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1">
      {status !== "APPROVED" && (
        <button disabled={busy} onClick={() => decide("APPROVED")} className="rounded-full border border-ok/40 px-2.5 py-1 text-xs font-bold text-ok hover:bg-ok/10 disabled:opacity-40">
          ✓ Approve
        </button>
      )}
      {status !== "REJECTED" && (
        <button disabled={busy} onClick={() => setAsking(true)} className="rounded-full border border-risk/40 px-2.5 py-1 text-xs font-bold text-risk hover:bg-risk/10 disabled:opacity-40">
          Needs revision
        </button>
      )}
      {status !== "PENDING" && (
        <button disabled={busy} onClick={() => decide("PENDING")} className="rounded-full px-2 py-1 text-xs font-semibold text-ink/40 hover:bg-black/5 disabled:opacity-40">
          Undo
        </button>
      )}
    </div>
  );
}

/** Delete a file (manager any time; uploader while still unreviewed). */
export function DeleteFileButton({ fileId }: { fileId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function remove() {
    setBusy(true);
    await fetch(`/api/staff-tasks/files/${fileId}`, { method: "DELETE" });
    router.refresh();
    setBusy(false);
  }

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} title="Delete file" className="rounded-full px-2 py-1 text-xs font-bold text-ink/30 hover:bg-risk/10 hover:text-risk">
        ✕
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1">
      <button disabled={busy} onClick={remove} className="rounded-full bg-risk px-2.5 py-1 text-xs font-bold text-white disabled:opacity-40">
        Delete
      </button>
      <button onClick={() => setConfirming(false)} className="rounded-full px-2 py-1 text-xs font-semibold text-ink/50 hover:bg-black/5">
        No
      </button>
    </span>
  );
}

/** Manager: delete the whole task. */
export function DeleteTaskButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function remove() {
    setBusy(true);
    const res = await fetch(`/api/staff-tasks/${taskId}`, { method: "DELETE" });
    if (res.ok) router.push("/app/tasks");
    setBusy(false);
  }

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className="rounded-full border border-black/15 px-3 py-1.5 text-sm font-semibold text-ink/50 hover:bg-risk/10 hover:text-risk">
        Delete task
      </button>
    );
  }
  return (
    <span className="flex items-center gap-2">
      <span className="text-sm text-ink/60">Delete this task and its files?</span>
      <button disabled={busy} onClick={remove} className="rounded-full bg-risk px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40">
        {busy ? "Deleting…" : "Delete"}
      </button>
      <button onClick={() => setConfirming(false)} className="rounded-full border border-black/15 px-3 py-1.5 text-sm font-semibold hover:bg-black/5">
        Cancel
      </button>
    </span>
  );
}

/** Manager's overall note on the task. */
export function ManagerNote({ taskId, value }: { taskId: string; value: string }) {
  const router = useRouter();
  const [note, setNote] = useState(value);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await fetch(`/api/staff-tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerNote: note }),
    });
    router.refresh();
    setBusy(false);
  }

  return (
    <div>
      <textarea
        rows={3} value={note} onChange={(e) => setNote(e.target.value)}
        placeholder="Feedback for whoever is doing this task" className={inputCls}
      />
      <button
        onClick={save} disabled={busy || note === value}
        className="mt-2 rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-40"
      >
        {busy ? "Saving…" : "Save note"}
      </button>
    </div>
  );
}
