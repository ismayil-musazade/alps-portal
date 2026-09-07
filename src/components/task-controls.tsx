"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputCls, inputBase, StatusBadge } from "@/components/ui";

/* ---------------- assign panel ---------------- */

type Template = { id: string; title: string; category: string; courseType: string };

export function AssignTasksPanel({ studentId, templates, assignedTemplateIds, defaultCourseType }: {
  studentId: string;
  templates: Template[];
  assignedTemplateIds: string[];
  defaultCourseType: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [courseType, setCourseType] = useState(defaultCourseType);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const assigned = useMemo(() => new Set(assignedTemplateIds), [assignedTemplateIds]);
  const groups = useMemo(() => {
    const byCat: Record<string, Template[]> = {};
    for (const t of templates.filter((t) => t.courseType === courseType)) {
      (byCat[t.category] ??= []).push(t);
    }
    return byCat;
  }, [templates, courseType]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function assign() {
    if (!selected.size) return;
    setBusy(true);
    setMsg("");
    const res = await fetch(`/api/students/${studentId}/tasks`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateIds: [...selected] }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg(`Assigned ${body.created} task(s)${body.skipped ? `, ${body.skipped} already assigned` : ""}.`);
      setSelected(new Set());
      router.refresh();
    } else setMsg(body.error ?? "Failed");
    setBusy(false);
  }

  async function addCustom(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/students/${studentId}/tasks`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: String(fd.get("title")), category: String(fd.get("category")),
        courseType, deadline: String(fd.get("deadline") ?? ""),
      }),
    });
    if (res.ok) { (e.target as HTMLFormElement).reset(); router.refresh(); }
    setBusy(false);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
        + Assign tasks
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-ink/50">Assign from templates</h3>
        <select value={courseType} onChange={(e) => { setCourseType(e.target.value); setSelected(new Set()); }} className={`${inputBase} w-44`}>
          {["SAT","IELTS","GENERAL_ENGLISH","OTHER"].map((c) => <option key={c} value={c}>{c.replaceAll("_"," ")}</option>)}
        </select>
        <button onClick={() => setOpen(false)} className="ml-auto text-sm font-semibold text-ink/50 hover:text-ink">close</button>
      </div>

      <div className="mt-3 grid max-h-72 gap-3 overflow-y-auto md:grid-cols-2">
        {Object.entries(groups).map(([cat, list]) => (
          <div key={cat}>
            <div className="mb-1 text-xs font-bold uppercase tracking-wide text-ink/40">{cat.replaceAll("_", " ").toLowerCase()}</div>
            <div className="flex flex-wrap gap-1.5">
              {list.map((t) => {
                const done = assigned.has(t.id);
                const sel = selected.has(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={done}
                    onClick={() => toggle(t.id)}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                      done ? "cursor-default bg-black/5 text-ink/30 line-through"
                      : sel ? "bg-brand text-white"
                      : "border border-black/15 bg-white hover:border-brand hover:text-brand"
                    }`}
                  >
                    {t.title}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {!Object.keys(groups).length && <p className="text-sm text-ink/40">No templates for this course type.</p>}
      </div>

      <div className="mt-3 flex items-center gap-3 border-t border-black/5 pt-3">
        <button onClick={assign} disabled={busy || !selected.size} className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-40">
          {busy ? "Assigning…" : `Assign ${selected.size || ""} selected`}
        </button>
        {msg && <span className="text-sm text-ink/60">{msg}</span>}
      </div>

      <form onSubmit={addCustom} className="mt-3 flex flex-wrap items-end gap-2 border-t border-black/5 pt-3">
        <Field label="Custom task"><input name="title" required className={inputCls} placeholder="e.g. Essay: My City" /></Field>
        <Field label="Category">
          <select name="category" className={inputCls}>
            {["HOMEWORK","PRACTICE_TEST","VOCAB_LIST","READING_ARTICLE","WRITING_TASK","SPEAKING_TASK","EXAM_REVIEW"].map((c) => (
              <option key={c} value={c}>{c.replaceAll("_"," ").toLowerCase()}</option>
            ))}
          </select>
        </Field>
        <Field label="Deadline"><input type="date" name="deadline" className={inputCls} /></Field>
        <button disabled={busy} className="rounded-full border border-black/15 px-4 py-2 text-sm font-semibold hover:bg-black/5 disabled:opacity-40">Add custom</button>
      </form>
    </div>
  );
}

/* ---------------- tasks table ---------------- */

export type TaskDTO = {
  id: string; title: string; category: string; status: string;
  teacherApproved: boolean; score: number | null; scoreMax: number;
  comment: string; mistakeReviewDone: boolean; deadline: string; // dd/mm/yyyy or ""
  deadlineISO: string;
};

const TASK_TONE = (s: string) =>
  s === "COMPLETED" ? "ok" : s === "MISSING" || s === "LATE" ? "risk" : s === "IN_PROGRESS" || s === "SUBMITTED" ? "warn" : "muted";

export function TasksTable({ tasks, mode }: { tasks: TaskDTO[]; mode: "editor" | "student" | "readonly" }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-black/10 bg-white">
      <table className="w-full min-w-190 text-sm">
        <thead className="bg-paper text-left">
          <tr>
            <th className="px-4 py-2.5 font-semibold">Task</th>
            <th className="px-4 py-2.5 font-semibold">Category</th>
            <th className="px-4 py-2.5 font-semibold">Deadline</th>
            <th className="px-4 py-2.5 font-semibold">Status</th>
            <th className="px-4 py-2.5 font-semibold">Score</th>
            <th className="px-4 py-2.5 font-semibold">Comment</th>
            {mode !== "readonly" && <th className="px-4 py-2.5 text-right font-semibold">{mode === "editor" ? "Actions" : ""}</th>}
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) =>
            mode === "editor" ? <EditorRow key={t.id} t={t} /> : <PlainRow key={t.id} t={t} submit={mode === "student"} />
          )}
          {!tasks.length && (
            <tr><td colSpan={7} className="px-4 py-10 text-center text-ink/40">No tasks assigned yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PlainRow({ t, submit }: { t: TaskDTO; submit: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function markSubmitted() {
    setBusy(true);
    await fetch(`/api/tasks/${t.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "submit" }),
    });
    router.refresh();
  }

  return (
    <tr className="border-t border-black/5">
      <td className="px-4 py-2.5 font-medium">{t.title}{t.mistakeReviewDone && <span className="ml-1 text-xs text-ok">✓rev</span>}</td>
      <td className="px-4 py-2.5 text-ink/60">{t.category.replaceAll("_", " ").toLowerCase()}</td>
      <td className="px-4 py-2.5">{t.deadline || "—"}</td>
      <td className="px-4 py-2.5"><StatusBadge value={t.status} tone={TASK_TONE(t.status)} /></td>
      <td className="px-4 py-2.5 font-semibold">{t.score != null ? `${t.score}/${t.scoreMax}` : "—"}</td>
      <td className="max-w-60 px-4 py-2.5 text-ink/60">{t.comment || "—"}</td>
      {submit && (
        <td className="px-4 py-2.5 text-right">
          {["NOT_STARTED", "IN_PROGRESS", "MISSING", "LATE"].includes(t.status) && (
            <button onClick={markSubmitted} disabled={busy} className="rounded-full bg-brand-tint px-3 py-1 text-xs font-bold text-brand-dark hover:bg-brand hover:text-white disabled:opacity-40">
              {busy ? "…" : "Mark done"}
            </button>
          )}
          {t.status === "SUBMITTED" && <span className="text-xs text-ink/40">waiting for teacher</span>}
        </td>
      )}
    </tr>
  );
}

function EditorRow({ t }: { t: TaskDTO }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState(t.comment);
  const [score, setScore] = useState(t.score?.toString() ?? "");

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    await fetch(`/api/tasks/${t.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    router.refresh();
    setBusy(false);
  }

  async function remove() {
    if (!window.confirm(`Delete task "${t.title}"?`)) return;
    setBusy(true);
    await fetch(`/api/tasks/${t.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <tr className={`border-t border-black/5 ${busy ? "opacity-50" : ""}`}>
      <td className="px-4 py-2 font-medium">
        {t.title}
        {t.status === "SUBMITTED" && !t.teacherApproved && <span className="ml-1.5 rounded-full bg-warn/10 px-2 py-0.5 text-xs font-bold text-warn">check</span>}
      </td>
      <td className="px-4 py-2 text-ink/60">{t.category.replaceAll("_", " ").toLowerCase()}</td>
      <td className="px-4 py-2">
        <input
          type="date" defaultValue={t.deadlineISO} disabled={busy}
          onChange={(e) => patch({ deadline: e.target.value })}
          className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
        />
      </td>
      <td className="px-4 py-2">
        <select value={t.status} disabled={busy} onChange={(e) => patch({ status: e.target.value })}
          className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold">
          {["NOT_STARTED","IN_PROGRESS","SUBMITTED","COMPLETED","MISSING","LATE"].map((s) => (
            <option key={s} value={s}>{s.replaceAll("_"," ").toLowerCase()}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-1">
          <input
            value={score} disabled={busy} inputMode="decimal" placeholder="—"
            onChange={(e) => setScore(e.target.value)}
            onBlur={() => {
              const v = score.trim() === "" ? null : Number(score);
              if (v === null || (!Number.isNaN(v) && v !== t.score)) patch({ score: v });
            }}
            className="w-14 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold"
          />
          <span className="text-xs text-ink/40">/{t.scoreMax}</span>
        </div>
      </td>
      <td className="px-4 py-2">
        <input
          value={comment} disabled={busy} placeholder="comment…"
          onChange={(e) => setComment(e.target.value)}
          onBlur={() => { if (comment !== t.comment) patch({ comment }); }}
          className="w-full min-w-32 rounded-lg border border-gray-200 px-2 py-1 text-xs"
        />
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
          <button
            title="Approve — marks completed"
            onClick={() => patch({ teacherApproved: !t.teacherApproved })}
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${t.teacherApproved ? "bg-ok text-white" : "bg-ok/10 text-ok hover:bg-ok/20"}`}
          >
            {t.teacherApproved ? "✓ approved" : "approve"}
          </button>
          <button
            title="Mistake review done"
            onClick={() => patch({ mistakeReviewDone: !t.mistakeReviewDone })}
            className={`rounded-full px-2 py-1 text-xs font-bold ${t.mistakeReviewDone ? "bg-ink text-white" : "bg-black/5 text-ink/50 hover:bg-black/10"}`}
          >
            rev
          </button>
          <button title="Delete task" onClick={remove} className="rounded-full bg-risk/10 px-2 py-1 text-xs font-bold text-risk hover:bg-risk/20">✕</button>
        </div>
      </td>
    </tr>
  );
}

/* ---------------- skills ---------------- */

const SKILL_STATUSES = ["NOT_STARTED","LEARNING","NEEDS_IMPROVEMENT","GOOD","MASTERED"] as const;
const SKILL_TONE: Record<string, "muted" | "warn" | "risk" | "brand" | "ok"> = {
  NOT_STARTED: "muted", LEARNING: "warn", NEEDS_IMPROVEMENT: "risk", GOOD: "brand", MASTERED: "ok",
};

export function SkillsPanel({ studentId, courseType, skills, editable }: {
  studentId: string; courseType: string;
  skills: { skill: string; status: string }[];
  editable: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState("");

  async function set(skill: string, status: string) {
    setBusy(skill);
    await fetch(`/api/students/${studentId}/skills`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseType, skill, status }),
    });
    router.refresh();
    setBusy("");
  }

  if (!skills.length) return null;

  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink/50">Skill checklist</h3>
      <div className="grid gap-2 md:grid-cols-2">
        {skills.map((s) => (
          <div key={s.skill} className="flex items-center justify-between gap-3 rounded-lg bg-paper px-3 py-2">
            <span className="text-sm font-medium">{s.skill}</span>
            {editable ? (
              <select
                value={s.status} disabled={busy === s.skill}
                onChange={(e) => set(s.skill, e.target.value)}
                className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold"
              >
                {SKILL_STATUSES.map((st) => <option key={st} value={st}>{st.replaceAll("_", " ").toLowerCase()}</option>)}
              </select>
            ) : (
              <StatusBadge value={s.status} tone={SKILL_TONE[s.status]} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
