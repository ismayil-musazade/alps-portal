"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputCls } from "@/components/ui";

export function ConvertButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function convert() {
    setBusy(true);
    const res = await fetch(`/api/leads/${leadId}/convert`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      router.push(`/app/students/${body.studentId}`);
      router.refresh();
    } else setBusy(false);
  }

  if (!confirm) {
    return (
      <button onClick={() => setConfirm(true)} className="rounded-full bg-ok px-4 py-1.5 text-sm font-bold text-white hover:opacity-90">
        Convert to student
      </button>
    );
  }
  return (
    <span className="flex items-center gap-2">
      <span className="text-sm font-semibold">Create student profile?</span>
      <button onClick={convert} disabled={busy} className="rounded-full bg-ok px-4 py-1.5 text-sm font-bold text-white disabled:opacity-50">
        {busy ? "Converting…" : "Yes, convert"}
      </button>
      <button onClick={() => setConfirm(false)} className="rounded-full border border-black/15 px-3 py-1.5 text-sm font-semibold">
        Cancel
      </button>
    </span>
  );
}

/** Sub-target fields per course type (brief §9). */
const SUB_FIELDS: Record<string, string[]> = {
  IELTS: ["Reading", "Listening", "Writing", "Speaking"],
  SAT: ["Reading & Writing", "Math", "Vocabulary", "Reading", "Practice tests"],
  GENERAL_ENGLISH: ["Grammar", "Vocabulary", "Speaking"],
  OTHER: ["Custom 1", "Custom 2"],
};

export function GoalForm({
  studentId,
  initial,
}: {
  studentId: string;
  initial?: { courseType: string; targetOverall: string; targetExamDate: string; subTargets: Record<string, string>; notes: string };
}) {
  const router = useRouter();
  const [courseType, setCourseType] = useState(initial?.courseType ?? "SAT");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(Boolean(initial));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const subTargets: Record<string, string> = {};
    for (const f of SUB_FIELDS[courseType]) {
      const v = String(fd.get(`sub:${f}`) ?? "").trim();
      if (v) subTargets[f] = v;
    }
    const res = await fetch(`/api/students/${studentId}/goals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseType,
        targetOverall: String(fd.get("targetOverall") ?? ""),
        targetExamDate: String(fd.get("targetExamDate") ?? ""),
        subTargets,
        notes: String(fd.get("notes") ?? ""),
      }),
    });
    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      setError((await res.json().catch(() => ({}))).error ?? "Save failed");
    }
    setBusy(false);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
        {initial ? "Edit goal" : "+ Set goal"}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-black/10 bg-white p-4 md:grid-cols-2">
      <Field label="Course type">
        <select value={courseType} onChange={(e) => setCourseType(e.target.value)} className={inputCls}>
          {Object.keys(SUB_FIELDS).map((c) => <option key={c} value={c}>{c.replaceAll("_", " ")}</option>)}
        </select>
      </Field>
      <Field label="Target overall score / level">
        <input name="targetOverall" defaultValue={initial?.targetOverall} className={inputCls} placeholder={courseType === "IELTS" ? "7.5" : courseType === "SAT" ? "1400" : "B2"} />
      </Field>
      <Field label="Target exam date">
        <input type="date" name="targetExamDate" defaultValue={initial?.targetExamDate} className={inputCls} />
      </Field>
      <div className="md:col-span-2 grid grid-cols-2 gap-3 md:grid-cols-3">
        {SUB_FIELDS[courseType].map((f) => (
          <Field key={f} label={f}>
            <input name={`sub:${f}`} defaultValue={initial?.subTargets?.[f] ?? ""} className={inputCls} />
          </Field>
        ))}
      </div>
      <Field label="Notes" className="md:col-span-2">
        <textarea name="notes" defaultValue={initial?.notes} rows={2} className={inputCls} />
      </Field>
      {error && <p className="rounded-lg bg-brand-tint px-3 py-2 text-sm text-brand-dark md:col-span-2">{error}</p>}
      <div className="flex gap-2 md:col-span-2">
        <button disabled={busy} className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
          {busy ? "Saving…" : "Save goal"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-black/15 px-4 py-2 text-sm font-semibold">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function NoteBox({ studentId, canManagerOnly }: { studentId: string; canManagerOnly: boolean }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState("STAFF");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/students/${studentId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, visibility }),
    });
    if (res.ok) {
      setBody("");
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <form onSubmit={add} className="flex flex-wrap gap-2">
      <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className={`${inputCls} w-40 shrink-0`}>
        {canManagerOnly && <option value="MANAGER_ONLY">Manager only</option>}
        <option value="STAFF">Staff + manager</option>
        <option value="TEACHER">Teachers too</option>
      </select>
      <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Internal note (never visible to student/parent)" className={`${inputCls} min-w-50 flex-1`} />
      <button disabled={busy || !body.trim()} className="shrink-0 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Add</button>
    </form>
  );
}
