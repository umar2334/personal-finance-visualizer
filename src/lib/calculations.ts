import type { Category, Transaction, TxType } from "@/types";
import { monthOf } from "./dates";
import { sumMoney } from "./money";

export interface Summary {
  income: number;
  expense: number;
  net: number;
  /** Share of income kept, 0-100. Null when there is no income to compare with. */
  savingsRate: number | null;
}

export function summarize(transactions: Transaction[]): Summary {
  const income = sumMoney(transactions.filter((t) => t.type === "income").map((t) => t.amount));
  const expense = sumMoney(transactions.filter((t) => t.type === "expense").map((t) => t.amount));
  const net = sumMoney([income, -expense]);
  return { income, expense, net, savingsRate: income > 0 ? Math.round((net / income) * 100) : null };
}

export interface TransactionFilter {
  from?: string;
  to?: string;
  search?: string;
  type?: TxType | "all";
  categoryId?: string;
}

/** ISO dates sort lexically, so plain string comparison is correct here. */
export function filterTransactions(
  transactions: Transaction[],
  filter: TransactionFilter,
  categoryLabel: (id: string) => string = () => "",
): Transaction[] {
  const q = filter.search?.trim().toLowerCase();
  return transactions.filter((t) => {
    if (filter.from && t.date < filter.from) return false;
    if (filter.to && t.date > filter.to) return false;
    if (filter.type && filter.type !== "all" && t.type !== filter.type) return false;
    if (filter.categoryId && filter.categoryId !== "all" && t.categoryId !== filter.categoryId) return false;
    if (q && !t.description.toLowerCase().includes(q) && !categoryLabel(t.categoryId).toLowerCase().includes(q)) return false;
    return true;
  });
}

export function sortNewestFirst(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  );
}

export interface CategorySpend {
  category: Category;
  amount: number;
  percentage: number;
}

/** Expense totals per category, largest first. Percentages are whole numbers of the total. */
export function spendingByCategory(transactions: Transaction[], categories: Category[]): CategorySpend[] {
  const expenses = transactions.filter((t) => t.type === "expense");
  const total = sumMoney(expenses.map((t) => t.amount));
  if (total === 0) return [];
  return categories
    .map((category) => {
      const amount = sumMoney(expenses.filter((t) => t.categoryId === category.id).map((t) => t.amount));
      return { category, amount, percentage: Math.round((amount / total) * 100) };
    })
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

export interface MonthPoint {
  month: string;
  income: number;
  expense: number;
  net: number;
}

/** One point per month in `months`, including months with no activity. */
export function monthlySeries(transactions: Transaction[], months: string[]): MonthPoint[] {
  return months.map((month) => {
    const { income, expense, net } = summarize(transactions.filter((t) => monthOf(t.date) === month));
    return { month, income, expense, net };
  });
}
