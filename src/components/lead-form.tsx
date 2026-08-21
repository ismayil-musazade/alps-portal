"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputCls } from "@/components/ui";

type StaffOption = { id: string; name: string };

export function LeadForm({
  staffOptions,
  initial,
  leadId,
}: {
  staffOptions: StaffOption[];
  initial?: Record<string, string>;
  leadId?: string; // present = edit mode
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = await fetch(leadId ? `/api/leads/${leadId}` : "/api/leads", {
      method: leadId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      router.push(leadId ? `/app/leads/${leadId}` : `/app/leads/${body.id}`);
      router.refresh();
    } else {
      setError(body.error ?? "Save failed");
      setBusy(false);
    }
  }

  const v = (k: string) => initial?.[k] ?? "";

  return (
    <form onSubmit={submit} className="mt-4 grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
      <Field label="Full name *"><input name="fullName" required defaultValue={v("fullName")} className={inputCls} /></Field>
      <Field label="Phone *"><input name="phone" required defaultValue={v("phone")} className={inputCls} placeholder="+994 __ ___ __ __" /></Field>
      <Field label="Parent name"><input name="parentName" defaultValue={v("parentName")} className={inputCls} /></Field>
      <Field label="Parent phone"><input name="parentPhone" defaultValue={v("parentPhone")} className={inputCls} /></Field>
      <Field label="School / university"><input name="school" defaultValue={v("school")} className={inputCls} /></Field>
      <Field label="Grade / level"><input name="gradeLevel" defaultValue={v("gradeLevel")} className={inputCls} /></Field>
      <Field label="Source">
        <select name="source" defaultValue={v("source") || "INSTAGRAM"} className={inputCls}>
          {["INSTAGRAM","WHATSAPP","REFERRAL","WALK_IN","PHONE_CALL","WEBSITE","OTHER"].map((s) => (
            <option key={s} value={s}>{s.replaceAll("_", " ").toLowerCase()}</option>
          ))}
        </select>
      </Field>
      <Field label="Interested course">
        <select name="interestedCourse" defaultValue={v("interestedCourse")} className={inputCls}>
          <option value="">—</option>
          {["IELTS","SAT","GENERAL_ENGLISH","OTHER"].map((s) => (
            <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
          ))}
        </select>
      </Field>
      <Field label="Current level (if known)"><input name="currentLevel" defaultValue={v("currentLevel")} className={inputCls} /></Field>
      <Field label="Target score / level"><input name="targetScore" defaultValue={v("targetScore")} className={inputCls} /></Field>
      <Field label="Preferred schedule"><input name="preferredSchedule" defaultValue={v("preferredSchedule")} className={inputCls} /></Field>
      <Field label="Group / individual">
        <select name="groupPreference" defaultValue={v("groupPreference")} className={inputCls}>
          <option value="">—</option>
          <option value="group">Group</option>
          <option value="individual">Individual</option>
        </select>
      </Field>
      <Field label="Responsible staff">
        <select name="responsibleStaffId" defaultValue={v("responsibleStaffId")} className={inputCls}>
          <option value="">—</option>
          {staffOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </Field>
      <Field label="Next follow-up"><input type="date" name="nextFollowUpAt" defaultValue={v("nextFollowUpAt")} className={inputCls} /></Field>
      <Field label="Note" className="md:col-span-2">
        <textarea name="lastContactNote" defaultValue={v("lastContactNote")} rows={3} className={inputCls} />
      </Field>

      {error && <p className="rounded-lg bg-brand-tint px-3 py-2 text-sm text-brand-dark md:col-span-2" role="alert">{error}</p>}

      <div className="md:col-span-2">
        <button disabled={busy} className="rounded-full bg-brand px-6 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
          {busy ? "Saving…" : leadId ? "Save changes" : "Create lead"}
        </button>
      </div>
    </form>
  );
}
