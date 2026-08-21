"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type RosterRow = { studentId: string; name: string; current: string | null };

const STATUSES = [
  ["PRESENT", "P", "bg-ok text-white", "bg-ok/10 text-ok"],
  ["LATE", "L", "bg-warn text-white", "bg-warn/10 text-warn"],
  ["ABSENT", "A", "bg-risk text-white", "bg-risk/10 text-risk"],
] as const;

export function AttendanceSheet({ groupId, lessonDate, roster }: { groupId: string; lessonDate: string; roster: RosterRow[] }) {
  const router = useRouter();
  // default: keep existing mark, otherwise PRESENT
  const [marks, setMarks] = useState<Record<string, string>>(
    Object.fromEntries(roster.map((r) => [r.studentId, r.current ?? "PRESENT"]))
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/attendance", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId, lessonDate,
        records: roster.map((r) => ({ studentId: r.studentId, status: marks[r.studentId] })),
      }),
    });
    const body = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Saved ${body.saved} record(s).` : body.error ?? "Save failed");
    if (res.ok) router.refresh();
    setBusy(false);
  }

  return (
    <div className="rounded-xl border border-black/10 bg-white">
      <ul className="divide-y divide-black/5">
        {roster.map((r) => (
          <li key={r.studentId} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-sm font-semibold">{r.name}</span>
            <span className="flex gap-1">
              {STATUSES.map(([value, label, on, off]) => (
                <button
                  key={value}
                  onClick={() => setMarks({ ...marks, [r.studentId]: value })}
                  className={`h-8 w-8 rounded-full text-xs font-extrabold transition ${marks[r.studentId] === value ? on : off}`}
                  title={value.toLowerCase()}
                >
                  {label}
                </button>
              ))}
            </span>
          </li>
        ))}
        {!roster.length && <li className="px-4 py-8 text-center text-sm text-ink/40">No active students in this group.</li>}
      </ul>
      {roster.length > 0 && (
        <div className="flex items-center gap-3 border-t border-black/10 p-3">
          <button onClick={save} disabled={busy} className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
            {busy ? "Saving…" : "Save attendance"}
          </button>
          {msg && <span className="text-sm text-ink/60">{msg}</span>}
          <span className="ml-auto text-xs text-ink/40">P present · L late · A absent</span>
        </div>
      )}
    </div>
  );
}
