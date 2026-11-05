import type { Budget, Category, Transaction } from "@/types";
import { monthOf } from "./dates";
import { sumMoney } from "./money";

export type BudgetStatus = "ok" | "warning" | "over";

/** From this share of the limit, a budget shows as "close to the limit". */
export const WARNING_THRESHOLD = 0.8;

export function budgetStatus(spent: number, limit: number): BudgetStatus {
  if (spent > limit) return "over";
  if (spent >= limit * WARNING_THRESHOLD) return "warning";
  return "ok";
}

export interface BudgetRow {
  category: Category;
  limit: number;
  spent: number;
  remaining: number;
  /** Uncapped: 130 means 30% over the limit. */
  percentage: number;
  status: BudgetStatus;
}

export function spentInMonth(transactions: Transaction[], month: string, categoryId: string): number {
  return sumMoney(
    transactions
      .filter((t) => t.type === "expense" && t.categoryId === categoryId && monthOf(t.date) === month)
      .map((t) => t.amount),
  );
}

export function buildBudgetRows(
  month: string,
  budgets: Budget[],
  transactions: Transaction[],
  categories: Category[],
): BudgetRow[] {
  const rows: BudgetRow[] = [];
  for (const budget of budgets) {
    if (budget.month !== month) continue;
    const category = categories.find((c) => c.id === budget.categoryId);
    if (!category) continue;
    const spent = spentInMonth(transactions, month, budget.categoryId);
    rows.push({
      category,
      limit: budget.limit,
      spent,
      remaining: sumMoney([budget.limit, -spent]),
      percentage: budget.limit > 0 ? Math.round((spent / budget.limit) * 100) : 0,
      status: budgetStatus(spent, budget.limit),
    });
  }
  return rows.sort((a, b) => b.percentage - a.percentage);
}

/** True only on the change that crosses the limit, so the alert doesn't repeat on every later entry. */
export function crossedLimit(spentBefore: number, spentAfter: number, limit: number): boolean {
  return spentBefore <= limit && spentAfter > limit;
}

/** Budgets from `from` re-dated to `to`, skipping categories that already have a budget in `to`. */
export function copyBudgets(budgets: Budget[], from: string, to: string): Budget[] {
  const taken = new Set(budgets.filter((b) => b.month === to).map((b) => b.categoryId));
  return budgets
    .filter((b) => b.month === from && !taken.has(b.categoryId))
    .map((b) => ({ month: to, categoryId: b.categoryId, limit: b.limit }));
}
