"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputCls } from "@/components/ui";

type Option = { id: string; name: string };

export function CourseForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = await fetch("/api/courses", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (res.ok) { setOpen(false); router.refresh(); }
    else setError((await res.json().catch(() => ({}))).error ?? "Save failed");
    setBusy(false);
  }

  if (!open) return <button onClick={() => setOpen(true)} className="rounded-full border border-black/15 px-4 py-1.5 text-sm font-semibold hover:bg-black/5">+ Course</button>;
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2 rounded-xl border border-black/10 bg-white p-3">
      <Field label="Course name"><input name="name" required className={inputCls} /></Field>
      <Field label="Type">
        <select name="type" className={inputCls}>
          {["IELTS","SAT","GENERAL_ENGLISH","OTHER"].map((t) => <option key={t} value={t}>{t.replaceAll("_"," ")}</option>)}
        </select>
      </Field>
      <button disabled={busy} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Add</button>
      <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-black/15 px-3 py-2 text-sm font-semibold">Cancel</button>
      {error && <p className="w-full text-sm text-brand-dark">{error}</p>}
    </form>
  );
}

export function GroupForm({ courses, teachers }: { courses: Option[]; teachers: Option[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = await fetch("/api/groups", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (res.ok) { setOpen(false); router.refresh(); }
    else setError((await res.json().catch(() => ({}))).error ?? "Save failed");
    setBusy(false);
  }

  if (!open) return <button onClick={() => setOpen(true)} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">+ New group</button>;
  return (
    <form onSubmit={submit} className="grid w-full grid-cols-1 gap-3 rounded-xl border border-black/10 bg-white p-4 md:grid-cols-5">
      <Field label="Group name"><input name="name" required className={inputCls} placeholder="SAT Evening B" /></Field>
      <Field label="Course">
        <select name="courseId" required className={inputCls}>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Teacher">
        <select name="teacherId" className={inputCls}>
          <option value="">—</option>
          {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Field>
      <Field label="Schedule"><input name="schedule" className={inputCls} placeholder="Mon/Wed 18:00-20:00" /></Field>
      <div className="flex items-end gap-2">
        <button disabled={busy} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Create</button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-black/15 px-3 py-2 text-sm font-semibold">Cancel</button>
      </div>
      {error && <p className="text-sm text-brand-dark md:col-span-5">{error}</p>}
    </form>
  );
}

export function GroupSettings({ groupId, teachers, current }: { groupId: string; teachers: Option[]; current: { teacherId: string; schedule: string; status: string } }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [teacherId, setTeacherId] = useState(current.teacherId);
  const [schedule, setSchedule] = useState(current.schedule);
  const [status, setStatus] = useState(current.status);

  const dirty = teacherId !== current.teacherId || schedule !== current.schedule || status !== current.status;

  async function save() {
    setBusy(true);
    const res = await fetch(`/api/groups/${groupId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherId, schedule, status }),
    });
    if (res.ok) router.refresh();
    setBusy(false);
  }

  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink/50">Group settings</h3>
      <Field label="Teacher">
        <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className={inputCls}>
          <option value="">—</option>
          {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Field>
      <Field label="Schedule" className="mt-2"><input value={schedule} onChange={(e) => setSchedule(e.target.value)} className={inputCls} /></Field>
      <Field label="Status" className="mt-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
          {["PLANNED","ACTIVE","FINISHED"].map((s) => <option key={s} value={s}>{s.toLowerCase()}</option>)}
        </select>
      </Field>
      <button onClick={save} disabled={busy || !dirty} className="mt-3 w-full rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
        {busy ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

export function EnrollForm({ groupId, candidates }: { groupId: string; candidates: Option[] }) {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function enroll() {
    if (!studentId) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/enrollments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, groupId }),
    });
    if (res.ok) { setStudentId(""); router.refresh(); }
    else setError((await res.json().catch(() => ({}))).error ?? "Failed");
    setBusy(false);
  }

  return (
    <div>
      <div className="flex gap-2">
        <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={inputCls}>
          <option value="">Add student to this group…</option>
          {candidates.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={enroll} disabled={busy || !studentId} className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
          Enroll
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-brand-dark">{error}</p>}
    </div>
  );
}

export function EndEnrollment({ enrollmentId }: { enrollmentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function end(status: "COMPLETED" | "DROPPED") {
    setBusy(true);
    await fetch(`/api/enrollments/${enrollmentId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  return (
    <span className="flex gap-1">
      <button onClick={() => end("COMPLETED")} disabled={busy} className="rounded-full bg-ok/10 px-2.5 py-1 text-xs font-bold text-ok hover:bg-ok/20 disabled:opacity-40">complete</button>
      <button onClick={() => end("DROPPED")} disabled={busy} className="rounded-full bg-risk/10 px-2.5 py-1 text-xs font-bold text-risk hover:bg-risk/20 disabled:opacity-40">drop</button>
    </span>
  );
}
