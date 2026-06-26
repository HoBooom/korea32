const KST = "Asia/Seoul";

/** "YYYY-MM-DD" for the given instant in KST. */
export function kstDateKey(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Today's date key in KST. */
export function todayKSTKey(): string {
  return kstDateKey(new Date().toISOString());
}

/** "6월 26일 (금) 오후 6:00" style label in KST. */
export function formatKST(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: KST,
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** "오후 6:00" KST kickoff time only. */
export function formatKSTTime(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: KST,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** "6월 26일 (금)" for a YYYY-MM-DD key, rendered in KST. */
export function formatDateKeyLabel(key: string): string {
  const d = new Date(`${key}T03:00:00Z`); // noon KST — safe from DST/edge
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: KST,
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(d);
}

/** Short weekday like "금" for a date key. */
export function weekdayShort(key: string): string {
  const d = new Date(`${key}T03:00:00Z`);
  return new Intl.DateTimeFormat("ko-KR", { timeZone: KST, weekday: "short" }).format(d);
}

/** Day-of-month number for a date key. */
export function dayOfMonth(key: string): number {
  return Number(key.slice(8, 10));
}

/** A YYYY-MM-DD key offset by n days. */
export function addDaysKey(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}
