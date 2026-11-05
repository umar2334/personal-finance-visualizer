const pad = (n: number) => String(n).padStart(2, "0");

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const todayISO = () => toISODate(new Date());

export const monthOf = (isoDate: string) => isoDate.slice(0, 7);

export function isValidISODate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d;
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function monthRange(month: string): DateRange {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return { from: `${month}-01`, to: `${month}-${pad(new Date(y, m, 0).getDate())}` };
}

/** The `count` months ending at `end`, oldest first. */
export function lastMonths(end: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addMonths(end, i - count + 1));
}

export interface DateRange {
  from: string;
  to: string;
}

export type RangePreset = "this_month" | "last_month" | "last_3_months" | "this_year" | "all" | "custom";

/** Resolves a preset to dates. Empty strings mean "unbounded". */
export function resolvePreset(preset: RangePreset, today: string): DateRange {
  const month = monthOf(today);
  switch (preset) {
    case "this_month":
      return monthRange(month);
    case "last_month":
      return monthRange(addMonths(month, -1));
    case "last_3_months":
      return { from: `${addMonths(month, -2)}-01`, to: monthRange(month).to };
    case "this_year":
      return { from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` };
    default:
      return { from: "", to: "" };
  }
}

export function formatMonth(month: string, lang: "en" | "ur", short = false): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return new Intl.DateTimeFormat(lang === "ur" ? "ur-PK" : "en-GB", {
    month: short ? "short" : "long",
    year: short ? "2-digit" : "numeric",
  }).format(new Date(y, m - 1, 1));
}

export function formatDate(iso: string, lang: "en" | "ur"): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat(lang === "ur" ? "ur-PK" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}
