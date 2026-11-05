import type { Currency } from "@/types";

/**
 * Sums in minor units (paisa/cents) so totals don't pick up floating-point
 * drift such as 0.1 + 0.2 = 0.30000000000000004.
 */
export function sumMoney(values: number[]): number {
  return values.reduce((total, v) => total + Math.round(v * 100), 0) / 100;
}

export const roundMoney = (value: number) => Math.round(value * 100) / 100;

export const MAX_AMOUNT = 999_999_999_999;

const SYMBOL: Record<Currency, string> = { PKR: "Rs ", USD: "$" };

export function formatMoney(value: number, currency: Currency, opts: { compact?: boolean } = {}): string {
  const abs = Math.abs(value);
  const number = new Intl.NumberFormat("en-US", opts.compact
    ? { notation: "compact", maximumFractionDigits: 1 }
    : { minimumFractionDigits: currency === "USD" ? 2 : 0, maximumFractionDigits: 2 },
  ).format(abs);
  return `${value < 0 ? "-" : ""}${SYMBOL[currency]}${number}`;
}
