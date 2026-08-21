"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputCls } from "@/components/ui";

/** Section score fields per course type (brief §12). */
const EXAM_SECTIONS: Record<string, string[]> = {
  IELTS: ["Reading", "Listening", "Writing", "Speaking"],
  SAT: ["Reading & Writing", "Math"],
  GENERAL_ENGLISH: ["Grammar", "Vocabulary", "Reading", "Speaking", "Writing"],
  OTHER: [],
};
const TOTAL_LABEL: Record<string, string> = {
  IELTS: "Overall band", SAT: "Total score", GENERAL_ENGLISH: "Overall level", OTHER: "Result",
};

export function ExamForm({ studentId, defaultCourseType }: { studentId: string; defaultCourseType: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [courseType, setCourseType] = useState(defaultCourseType in EXAM_SECTIONS ? defaultCourseType : "SAT");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const sectionScores: Record<string, string> = {};
    for (const s of EXAM_SECTIONS[courseType]) {
      const v = String(fd.get(`sec:${s}`) ?? "").trim();
      if (v) sectionScores[s] = v;
    }
    const res = await fetch(`/api/students/${studentId}/exams`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseType,
        examType: String(fd.get("examType")),
        examDate: String(fd.get("examDate")),
        totalScore: String(fd.get("totalScore")),
        sectionScores,
        teacherComment: String(fd.get("teacherComment") ?? ""),
        recommendedAction: String(fd.get("recommendedAction") ?? ""),
      }),
    });
    if (res.ok) { setOpen(false); router.refresh(); }
    else setError((await res.json().catch(() => ({}))).error ?? "Save failed");
    setBusy(false);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
        + Record exam
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-3 rounded-xl border border-black/10 bg-white p-4 md:grid-cols-4">
      <Field label="Course type">
        <select value={courseType} onChange={(e) => setCourseType(e.target.value)} className={inputCls}>
          {Object.keys(EXAM_SECTIONS).map((c) => <option key={c} value={c}>{c.replaceAll("_", " ")}</option>)}
        </select>
      </Field>
      <Field label="Exam type">
        <select name="examType" className={inputCls}>
          {["PLACEMENT", "PROGRESS", "MOCK", "FINAL"].map((t) => <option key={t} value={t}>{t.toLowerCase()}</option>)}
        </select>
      </Field>
      <Field label="Date"><input type="date" name="examDate" required className={inputCls} /></Field>
      <Field label={TOTAL_LABEL[courseType]}><input name="totalScore" required className={inputCls} placeholder={courseType === "IELTS" ? "7.0" : courseType === "SAT" ? "1350" : "B2"} /></Field>

      {EXAM_SECTIONS[courseType].length > 0 && (
        <div className="md:col-span-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          {EXAM_SECTIONS[courseType].map((s) => (
            <Field key={s} label={s}><input name={`sec:${s}`} className={inputCls} /></Field>
          ))}
        </div>
      )}

      <Field label="Teacher comment" className="md:col-span-2">
        <textarea name="teacherComment" rows={2} className={inputCls} />
      </Field>
      <Field label="Recommended action" className="md:col-span-2">
        <textarea name="recommendedAction" rows={2} className={inputCls} />
      </Field>

      {error && <p className="rounded-lg bg-brand-tint px-3 py-2 text-sm text-brand-dark md:col-span-4">{error}</p>}
      <div className="flex gap-2 md:col-span-4">
        <button disabled={busy} className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "Saving…" : "Save exam"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-black/15 px-4 py-2 text-sm font-semibold">Cancel</button>
      </div>
    </form>
  );
}

export function DeleteExamButton({ examId }: { examId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm("Delete this exam record?")) return;
    setBusy(true);
    await fetch(`/api/exams/${examId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <button onClick={remove} disabled={busy} className="rounded-full bg-risk/10 px-2.5 py-1 text-xs font-bold text-risk hover:bg-risk/20 disabled:opacity-40">
      delete
    </button>
  );
}
