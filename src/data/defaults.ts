import type { Budget, Category, Currency, Transaction, TxType } from "@/types";
import { addMonths, monthOf } from "@/lib/dates";
import { roundMoney } from "@/lib/money";

const cat = (id: string, name: string, type: TxType, color: string): Category => ({
  id, name, type, color, isDefault: true,
});

export const OTHER_EXPENSE_ID = "other-expense";
export const OTHER_INCOME_ID = "other-income";

export const DEFAULT_CATEGORIES: Category[] = [
  cat("salary", "Salary", "income", "#16a34a"),
  cat("freelance", "Freelance", "income", "#0d9488"),
  cat("business", "Business", "income", "#0284c7"),
  cat(OTHER_INCOME_ID, "Other income", "income", "#65a30d"),
  cat("food", "Food", "expense", "#f97316"),
  cat("rent", "Rent", "expense", "#8b5cf6"),
  cat("transport", "Transport", "expense", "#3b82f6"),
  cat("bills", "Bills", "expense", "#eab308"),
  cat("shopping", "Shopping", "expense", "#ec4899"),
  cat("health", "Health", "expense", "#ef4444"),
  cat("education", "Education", "expense", "#06b6d4"),
  cat("entertainment", "Entertainment", "expense", "#a855f7"),
  cat(OTHER_EXPENSE_ID, "Other", "expense", "#64748b"),
];

export const CATEGORY_COLORS = [
  "#f97316", "#8b5cf6", "#3b82f6", "#eab308", "#ec4899", "#ef4444",
  "#06b6d4", "#16a34a", "#0d9488", "#64748b", "#a855f7", "#65a30d",
];

/** [category, description, day of month, PKR amount, per-month variation] */
const SAMPLE_PLAN: [string, string, number, number, number][] = [
  ["salary", "Monthly salary", 1, 150000, 0],
  ["freelance", "Freelance project", 18, 28000, 6000],
  ["rent", "House rent", 2, 45000, 0],
  ["bills", "Electricity bill", 5, 9500, 1800],
  ["bills", "Internet", 6, 3500, 0],
  ["food", "Weekly groceries", 3, 8200, 900],
  ["food", "Weekly groceries", 10, 7600, 700],
  ["food", "Restaurant dinner", 14, 4300, 800],
  ["food", "Weekly groceries", 17, 8100, 600],
  ["transport", "Petrol", 4, 6500, 500],
  ["transport", "Ride hailing", 12, 2400, 400],
  ["shopping", "Clothes", 20, 7000, 3000],
  ["health", "Pharmacy", 9, 2600, 700],
  ["education", "Online course", 8, 4000, 0],
  ["entertainment", "Streaming and cinema", 15, 2800, 500],
];

/** Sample budgets are set so the demo shows one over-limit, one near-limit and one healthy state. */
const SAMPLE_BUDGETS: [string, number][] = [
  ["food", 25000],
  ["transport", 10500],
  ["shopping", 20000],
  ["bills", 20000],
];

const USD_PER_PKR = 1 / 280;

/**
 * Six months of invented entries for the demo. Every record is flagged
 * `isSample`, which drives the on-screen label and lets it be removed in one click.
 */
export function buildSampleData(today: string, currency: Currency): { transactions: Transaction[]; budgets: Budget[] } {
  const scale = (pkr: number) => (currency === "USD" ? roundMoney(pkr * USD_PER_PKR) : pkr);
  const thisMonth = monthOf(today);
  const dayOfMonth = Number(today.slice(8, 10));
  const transactions: Transaction[] = [];

  for (let back = 5; back >= 0; back--) {
    const month = addMonths(thisMonth, -back);
    SAMPLE_PLAN.forEach(([categoryId, description, day, base, swing], i) => {
      // Fixed pattern rather than random, so the demo looks the same on every visit.
      const amount = base + swing * (((back + i) % 3) - 1);
      // Spread the current month over the days so far, so nothing is dated in the future.
      const safeDay = back === 0 ? Math.max(1, Math.ceil((day * dayOfMonth) / 28)) : day;
      const date = `${month}-${String(safeDay).padStart(2, "0")}`;
      const isIncome = categoryId === "salary" || categoryId === "freelance";
      transactions.push({
        id: `sample-${month}-${i}`,
        type: isIncome ? "income" : "expense",
        amount: scale(amount),
        categoryId,
        description,
        date,
        createdAt: `${date}T09:00:00.000Z`,
        isSample: true,
      });
    });
  }

  const budgets = SAMPLE_BUDGETS.map(([categoryId, limit]) => ({
    month: thisMonth, categoryId, limit: scale(limit), isSample: true,
  }));
  return { transactions, budgets };
}
