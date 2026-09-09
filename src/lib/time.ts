/**
 * Every date the portal shows is the clock on the wall in Baku.
 *
 * The server runs in UTC on Vercel but in local time on a developer's Mac, so
 * anything formatted with the machine's own timezone drifts by four hours
 * between the two. Pinning the centre's timezone here makes a reminder set for
 * "10 September, 14:30" mean the same instant everywhere.
 *
 * Azerbaijan has been on UTC+4 all year round since it dropped daylight saving
 * in 2016, so a fixed offset is safe and keeps the parsing simple.
 */
export const CENTRE_TZ = "Asia/Baku";
const CENTRE_OFFSET = "+04:00";

const YMD = new Intl.DateTimeFormat("en-CA", {
  timeZone: CENTRE_TZ, year: "numeric", month: "2-digit", day: "2-digit",
});
const HM = new Intl.DateTimeFormat("en-GB", {
  timeZone: CENTRE_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

/**
 * Read a date coming from a form.
 *  - "2026-09-10T14:30"  (datetime-local) → 14:30 in Baku
 *  - "2026-09-10"        (date)           → `defaultHour` o'clock in Baku
 *  - anything carrying a zone (…Z, …+04:00) is trusted as-is
 *
 * Bare values are deliberately read as centre time rather than the browser's,
 * so a manager travelling abroad still books the follow-up for Baku 14:30.
 */
export function parseInstant(value: string, defaultHour = 0): Date | null {
  const v = value.trim();
  if (!v) return null;
  if (/(Z|[+-]\d{2}:\d{2})$/.test(v)) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // a bare date has no hour in it, so the caller decides what o'clock it means
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const hh = String(defaultHour).padStart(2, "0");
    return new Date(`${v}T${hh}:00:00${CENTRE_OFFSET}`);
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(v)) {
    const withSeconds = v.length === 16 ? `${v}:00` : v;
    return new Date(`${withSeconds}${CENTRE_OFFSET}`);
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Midnight in Baku today, as a real instant. */
export function startOfToday(now: Date = new Date()): Date {
  return new Date(`${YMD.format(now)}T00:00:00${CENTRE_OFFSET}`);
}

/** Whole days from today to that instant, counted in Baku days. */
export function daysFromToday(d: Date, now: Date = new Date()): number {
  const then = new Date(`${YMD.format(d)}T00:00:00${CENTRE_OFFSET}`);
  return Math.round((then.getTime() - startOfToday(now).getTime()) / 86_400_000);
}

export function isSameCentreDay(a: Date, b: Date) {
  return YMD.format(a) === YMD.format(b);
}

/** "10 Sep" by default; pass options through for longer forms. */
export function formatDate(d: Date, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  return d.toLocaleDateString("en-GB", { timeZone: CENTRE_TZ, ...opts });
}

/** "14:30" */
export function formatTime(d: Date) {
  return HM.format(d);
}

/** "10 Sep, 14:30" */
export function formatDateTime(d: Date, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  return `${formatDate(d, opts)}, ${formatTime(d)}`;
}

/** Value for an <input type="datetime-local">, in centre time. */
export function toDateTimeInput(d: Date) {
  return `${YMD.format(d)}T${HM.format(d)}`;
}

/** Value for an <input type="date">, in centre time. */
export function toDateInput(d: Date) {
  return YMD.format(d);
}
