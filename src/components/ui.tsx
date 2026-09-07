/** Tiny shared UI atoms — keep the operational look consistent. */

export function StatusBadge({ value, tone }: { value: string; tone?: "brand" | "ok" | "warn" | "risk" | "muted" }) {
  const cls = {
    brand: "bg-brand-tint text-brand-dark",
    ok: "bg-ok/10 text-ok",
    warn: "bg-warn/10 text-warn",
    risk: "bg-risk/10 text-risk",
    muted: "bg-black/5 text-ink/60",
  }[tone ?? "muted"];
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>
      {value.replaceAll("_", " ").toLowerCase()}
    </span>
  );
}

export const LEAD_STATUS_TONE: Record<string, "brand" | "ok" | "warn" | "risk" | "muted"> = {
  NEW: "warn",
  CONTACTED: "brand",
  PLACEMENT_BOOKED: "brand",
  PLACEMENT_DONE: "brand",
  TRIAL_BOOKED: "brand",
  INTERESTED: "ok",
  WAITING_DECISION: "warn",
  CONVERTED: "ok",
  LOST: "risk",
};

export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}

/** Field styling without a width — use when the element sits in a flex/grid row
 *  and needs its own sizing (a `w-*` class cannot beat `w-full` reliably). */
export const inputBase =
  "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

export const inputCls = `w-full ${inputBase}`;
