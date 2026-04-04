import { Transaction, CategoryData } from "../types";

export const CATEGORY_COLORS: Record<string, string> = {
  "Salary":        "#22c55e",
  "Freelance":     "#10b981",
  "Food":          "#f97316",
  "House Rent":    "#6366f1",
  "Transport":     "#3b82f6",
  "Shopping":      "#a855f7",
  "Entertainment": "#ec4899",
  "Health":        "#14b8a6",
  "Utilities":     "#f59e0b",
  "Education":     "#84cc16",
  "Savings":       "#06b6d4",
  "Other":         "#64748b",
};

export const ALL_CATEGORIES = Object.keys(CATEGORY_COLORS);

// No demo data — new users start empty
export function getDefaultTransactions(_userId: string): Transaction[] {
  return [];
}

export function getCategoryBreakdown(transactions: Transaction[]): CategoryData[] {
  const expenses = transactions.filter((t) => t.amount < 0);
  const total = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);
  const map: Record<string, number> = {};
  expenses.forEach((t) => {
    map[t.category] = (map[t.category] || 0) + Math.abs(t.amount);
  });
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .map(([category, amount]) => ({
      category,
      amount,
      color: CATEGORY_COLORS[category] || "#64748b",
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
    }));
}

export function getMonthlyChartData(transactions: Transaction[]) {
  const months: Record<string, { income: number; expenses: number }> = {};

  transactions.forEach((t) => {
    const d = new Date(t.created_at);
    const key = `${d.toLocaleString("default", { month: "short" })} '${String(d.getFullYear()).slice(2)}`;
    if (!months[key]) months[key] = { income: 0, expenses: 0 };
    if (t.amount > 0) months[key].income += t.amount;
    else months[key].expenses += Math.abs(t.amount);
  });

  return Object.entries(months)
    .slice(-3)
    .map(([month, { income, expenses }]) => ({
      month,
      income,
      expenses,
      savings: income - expenses,
    }));
}
