"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { inputCls, inputBase } from "@/components/ui";
import {
  DIRECT_POST_LIMIT_BYTES, MULTIPART_ABOVE_BYTES, MAX_FILE_BYTES, MAX_FILE_LABEL,
  humanSize, safeName, taskFolder,
} from "@/lib/uploads";

type Staff = { id: string; name: string; role: string };

/**
 * Manager: assign a new task.
 *
 * `parentTaskId` turns this into a follow-up — the task that comes out of
 * another one, which is how most work actually goes: hand it in, get a note
 * back, do the next round.
 */
export function NewTaskForm({
  staff,
  parentTaskId,
  defaultAssignedToId,
  label = "+ New task",
}: {
  staff: Staff[];
  parentTaskId?: string;
  defaultAssignedToId?: string;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [assignedToId, setAssignedToId] = useState(defaultAssignedToId ?? staff[0]?.id ?? "");
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
      body: JSON.stringify({ title, assignedToId, dueAt, description, parentTaskId }),
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
        className={
          parentTaskId
            ? "rounded-full border border-brand/40 px-4 py-1.5 text-sm font-semibold text-brand hover:bg-brand-tint"
            : "rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark"
        }
      >
        {label}
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
          type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)}
          className={`${inputBase} min-w-0 flex-1`} title="Deadline (date and time)"
        />
      </div>
      <textarea
        rows={3} placeholder="Details, context, what 'done' looks like (optional)"
        value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls}
      />
      {error && <p className="rounded-lg bg-white px-3 py-2 text-sm text-brand-dark">{error}</p>}
      <div className="flex gap-2">
        <button disabled={busy} className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-40">
          {busy ? "Assigning…" : parentTaskId ? "Assign follow-up" : "Assign task"}
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

/**
 * Upload a file against the task.
 *
 * The file goes from the browser straight to storage, which is the only way to
 * carry anything bigger than about 4.5 MB — a file routed through a serverless
 * function has to fit inside one request body. The server hands out a token
 * scoped to this task, then confirms with storage before recording the file.
 *
 * If that route is unavailable for any reason, a small file still falls back to
 * the original path through the server, so a hand-in is never simply lost.
 */
export function FileUpload({ taskId }: { taskId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [error, setError] = useState("");

  function reset() {
    if (inputRef.current) inputRef.current.value = "";
    setBusy(false);
    setPct(0);
  }

  async function throughServer(file: File) {
    const body = new FormData();
    body.append("file", file);
    const res = await fetch(`/api/staff-tasks/${taskId}/files`, { method: "POST", body });
    if (!res.ok) {
      throw new Error((await res.json().catch(() => ({}))).error ?? "Upload failed");
    }
  }

  async function send(file: File) {
    setError("");
    if (file.size > MAX_FILE_BYTES) {
      setError(`${humanSize(file.size)} is too big — the limit is ${MAX_FILE_LABEL}.`);
      reset();
      return;
    }

    setBusy(true);
    setPct(0);
    try {
      const blob = await upload(`${taskFolder(taskId)}${safeName(file.name)}`, file, {
        access: "private",
        handleUploadUrl: `/api/staff-tasks/${taskId}/blob-token`,
        contentType: file.type || undefined,
        multipart: file.size > MULTIPART_ABOVE_BYTES,
        onUploadProgress: (p) => setPct(Math.round(p.percentage)),
      });

      // storage has it; now the server checks it and writes the row
      const res = await fetch(`/api/staff-tasks/${taskId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: blob.url, filename: file.name }),
      });
      if (!res.ok) {
        throw new Error((await res.json().catch(() => ({}))).error ?? "Could not record the file");
      }
      router.refresh();
    } catch (directError) {
      if (file.size <= DIRECT_POST_LIMIT_BYTES) {
        try {
          await throughServer(file);
          router.refresh();
          reset();
          return;
        } catch (fallbackError) {
          setError(fallbackError instanceof Error ? fallbackError.message : "Upload failed");
          reset();
          return;
        }
      }
      setError(directError instanceof Error ? directError.message : "Upload failed");
    }
    reset();
  }

  return (
    <div>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-black/15 px-4 py-1.5 text-sm font-semibold hover:bg-black/5">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 16V4m0 0L7 9m5-5 5 5" />
          <path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
        </svg>
        {busy ? (pct > 0 && pct < 100 ? `Uploading ${pct}%` : "Uploading…") : "Upload file"}
        <input
          ref={inputRef} type="file" className="hidden" disabled={busy}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) send(f); }}
        />
      </label>
      {busy && (
        <div className="mt-1.5 h-1 w-40 overflow-hidden rounded-full bg-black/10">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
      <p className="mt-1 text-xs text-ink/40">
        Documents, spreadsheets, PDFs, images, zips or video, up to {MAX_FILE_LABEL} each.
      </p>
      {error && <p className="mt-1 rounded-lg bg-brand-tint px-3 py-2 text-sm text-brand-dark">{error}</p>}
    </div>
  );
}

/** The conversation on a task — the manager and the assignee talking it over. */
export function TaskComments({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/staff-tasks/${taskId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (res.ok) {
      setBody("");
      router.refresh();
    } else {
      setError((await res.json().catch(() => ({}))).error ?? "Could not send");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={send} className="mt-3">
      <textarea
        rows={2} value={body} onChange={(e) => setBody(e.target.value)}
        placeholder="Ask a question or leave a comment…" className={inputCls}
      />
      {error && <p className="mt-1 text-sm text-brand-dark">{error}</p>}
      <button
        disabled={busy || !body.trim()}
        className="mt-2 rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-white hover:bg-black disabled:opacity-40"
      >
        {busy ? "Sending…" : "Comment"}
      </button>
    </form>
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
