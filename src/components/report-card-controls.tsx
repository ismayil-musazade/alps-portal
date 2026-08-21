"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputCls } from "@/components/ui";

export function NewReportCardForm({ studentId, suggestedPeriod }: { studentId: string; suggestedPeriod: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = await fetch(`/api/students/${studentId}/report-cards`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (res.ok) { setOpen(false); router.refresh(); }
    else setError((await res.json().catch(() => ({}))).error ?? "Save failed");
    setBusy(false);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
        + New report card
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-3 rounded-xl border border-black/10 bg-white p-4 md:grid-cols-2">
      <Field label="Period (YYYY-MM)">
        <input name="period" required defaultValue={suggestedPeriod} pattern="\d{4}-\d{2}" className={inputCls} />
      </Field>
      <div className="hidden md:block" />
      <Field label="Strengths"><textarea name="strengths" rows={2} className={inputCls} placeholder="What the student does well" /></Field>
      <Field label="Weaknesses / to improve"><textarea name="weaknesses" rows={2} className={inputCls} placeholder="Areas needing work" /></Field>
      <Field label="Next target"><textarea name="nextTarget" rows={2} className={inputCls} placeholder="Plan for next month" /></Field>
      <Field label="Teacher comment (student/parent-friendly)"><textarea name="teacherComment" rows={2} className={inputCls} /></Field>
      {error && <p className="rounded-lg bg-brand-tint px-3 py-2 text-sm text-brand-dark md:col-span-2">{error}</p>}
      <div className="flex gap-2 md:col-span-2">
        <button disabled={busy} className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "Creating…" : "Create draft"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-black/15 px-4 py-2 text-sm font-semibold">Cancel</button>
      </div>
    </form>
  );
}

export function ReportCardEditor({ card }: {
  card: { id: string; period: string; strengths: string; weaknesses: string; nextTarget: string; teacherComment: string; published: boolean };
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/report-cards/${card.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (res.ok) { setEditing(false); router.refresh(); }
    else setError((await res.json().catch(() => ({}))).error ?? "Failed");
    setBusy(false);
  }

  async function remove() {
    if (!window.confirm(`Delete the ${card.period} report card?`)) return;
    setBusy(true);
    await fetch(`/api/report-cards/${card.id}`, { method: "DELETE" });
    router.refresh();
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    await patch(data);
  }

  if (editing) {
    return (
      <form onSubmit={save} className="mt-3 grid grid-cols-1 gap-3 border-t border-black/5 pt-3 md:grid-cols-2">
        <Field label="Strengths"><textarea name="strengths" rows={2} defaultValue={card.strengths} className={inputCls} /></Field>
        <Field label="Weaknesses"><textarea name="weaknesses" rows={2} defaultValue={card.weaknesses} className={inputCls} /></Field>
        <Field label="Next target"><textarea name="nextTarget" rows={2} defaultValue={card.nextTarget} className={inputCls} /></Field>
        <Field label="Teacher comment"><textarea name="teacherComment" rows={2} defaultValue={card.teacherComment} className={inputCls} /></Field>
        <div className="flex gap-2 md:col-span-2">
          <button disabled={busy} className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">Save</button>
          <button type="button" onClick={() => setEditing(false)} className="rounded-full border border-black/15 px-4 py-2 text-sm font-semibold">Cancel</button>
          {error && <span className="self-center text-sm text-brand-dark">{error}</span>}
        </div>
      </form>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-black/5 pt-3">
      <button onClick={() => setEditing(true)} className="rounded-full border border-black/15 px-3.5 py-1.5 text-xs font-bold hover:bg-black/5">
        edit
      </button>
      {card.published ? (
        <button onClick={() => patch({ publish: false })} disabled={busy} className="rounded-full bg-warn/10 px-3.5 py-1.5 text-xs font-bold text-warn hover:bg-warn/20 disabled:opacity-40">
          unpublish
        </button>
      ) : (
        <>
          <button onClick={() => patch({ refreshMetrics: true })} disabled={busy} className="rounded-full border border-black/15 px-3.5 py-1.5 text-xs font-bold hover:bg-black/5 disabled:opacity-40">
            refresh numbers
          </button>
          <button onClick={() => patch({ publish: true })} disabled={busy} className="rounded-full bg-ok px-4 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40">
            publish to student &amp; parent
          </button>
        </>
      )}
      <button onClick={remove} disabled={busy} className="ml-auto rounded-full bg-risk/10 px-3 py-1.5 text-xs font-bold text-risk hover:bg-risk/20 disabled:opacity-40">
        delete
      </button>
      {error && <span className="w-full text-sm text-brand-dark">{error}</span>}
    </div>
  );
}
