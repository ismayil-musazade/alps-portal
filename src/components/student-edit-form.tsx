"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputCls } from "@/components/ui";

export function StudentEditForm({ studentId, initial }: { studentId: string; initial: Record<string, string> }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = await fetch(`/api/students/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      router.push(`/app/students/${studentId}`);
      router.refresh();
    } else {
      setError((await res.json().catch(() => ({}))).error ?? "Save failed");
      setBusy(false);
    }
  }

  const v = (k: string) => initial[k] ?? "";

  return (
    <form onSubmit={submit} className="mt-4 grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
      <Field label="Full name *"><input name="fullName" required defaultValue={v("fullName")} className={inputCls} /></Field>
      <Field label="Status">
        <select name="status" defaultValue={v("status")} className={inputCls}>
          {["ACTIVE","FROZEN","COMPLETED","DROPPED","WAITING_GROUP"].map((s) => (
            <option key={s} value={s}>{s.replaceAll("_", " ").toLowerCase()}</option>
          ))}
        </select>
      </Field>
      <Field label="Student phone"><input name="phone" defaultValue={v("phone")} className={inputCls} /></Field>
      <Field label="Parent name"><input name="parentName" defaultValue={v("parentName")} className={inputCls} /></Field>
      <Field label="Parent phone"><input name="parentPhone" defaultValue={v("parentPhone")} className={inputCls} /></Field>
      <Field label="School / university"><input name="school" defaultValue={v("school")} className={inputCls} /></Field>
      <Field label="Grade / level"><input name="gradeLevel" defaultValue={v("gradeLevel")} className={inputCls} /></Field>
      <Field label="Current English level"><input name="currentLevel" defaultValue={v("currentLevel")} className={inputCls} /></Field>
      <Field label="Previous exam scores" className="md:col-span-2"><textarea name="previousScores" rows={2} defaultValue={v("previousScores")} className={inputCls} /></Field>
      <Field label="Strengths"><textarea name="strengths" rows={2} defaultValue={v("strengths")} className={inputCls} /></Field>
      <Field label="Weaknesses"><textarea name="weaknesses" rows={2} defaultValue={v("weaknesses")} className={inputCls} /></Field>
      <Field label="Learning difficulties / important notes" className="md:col-span-2">
        <textarea name="learningNotes" rows={2} defaultValue={v("learningNotes")} className={inputCls} />
      </Field>
      {error && <p className="rounded-lg bg-brand-tint px-3 py-2 text-sm text-brand-dark md:col-span-2">{error}</p>}
      <div className="md:col-span-2">
        <button disabled={busy} className="rounded-full bg-brand px-6 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
