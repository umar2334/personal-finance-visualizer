import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORIES, buildSampleData } from "@/data/defaults";
import type { Budget, Transaction, TxType } from "@/types";
import { buildBudgetRows, budgetStatus, copyBudgets, crossedLimit } from "./budgets";
import { filterTransactions, monthlySeries, sortNewestFirst, spendingByCategory, summarize } from "./calculations";
import { addMonths, isValidISODate, lastMonths, monthRange, resolvePreset } from "./dates";
import { formatMoney, sumMoney } from "./money";
import { LocalRepository, budFromRow, budToRow, txFromRow, txToRow } from "./repository";

let n = 0;
const tx = (type: TxType, amount: number, date: string, categoryId = "food", description = "x"): Transaction => ({
  id: `t${n++}`, type, amount, date, categoryId, description, createdAt: `${date}T00:00:00.000Z`,
});

describe("money", () => {
  it("sums without floating-point drift", () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
    expect(sumMoney([1000.1, 2000.2, 0.7])).toBe(3001);
  });
  it("formats each currency", () => {
    expect(formatMoney(1250, "PKR")).toBe("Rs 1,250");
    expect(formatMoney(1250.5, "PKR")).toBe("Rs 1,250.5");
    expect(formatMoney(1250, "USD")).toBe("$1,250.00");
    expect(formatMoney(-30, "USD")).toBe("-$30.00");
  });
});

describe("dates", () => {
  it("rejects dates that don't exist", () => {
    expect(isValidISODate("2026-02-29")).toBe(false);
    expect(isValidISODate("2024-02-29")).toBe(true);
    expect(isValidISODate("2026-13-01")).toBe(false);
  });
  it("crosses year boundaries", () => {
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2025-12", 1)).toBe("2026-01");
    expect(lastMonths("2026-02", 3)).toEqual(["2025-12", "2026-01", "2026-02"]);
  });
  it("finds the real end of a month", () => {
    expect(monthRange("2024-02").to).toBe("2024-02-29");
    expect(monthRange("2026-02").to).toBe("2026-02-28");
  });
  it("resolves presets", () => {
    expect(resolvePreset("last_month", "2026-01-15")).toEqual({ from: "2025-12-01", to: "2025-12-31" });
    expect(resolvePreset("last_3_months", "2026-01-15")).toEqual({ from: "2025-11-01", to: "2026-01-31" });
    expect(resolvePreset("all", "2026-01-15")).toEqual({ from: "", to: "" });
  });
});

describe("summarize", () => {
  it("totals income, expense, net and savings rate", () => {
    expect(summarize([tx("income", 1000, "2026-01-01"), tx("expense", 250, "2026-01-02")]))
      .toEqual({ income: 1000, expense: 250, net: 750, savingsRate: 75 });
  });
  it("has no savings rate without income", () => {
    expect(summarize([tx("expense", 250, "2026-01-02")]).savingsRate).toBeNull();
  });
  it("handles an empty list", () => {
    expect(summarize([])).toEqual({ income: 0, expense: 0, net: 0, savingsRate: null });
  });
  it("allows negative net", () => {
    const s = summarize([tx("income", 100, "2026-01-01"), tx("expense", 300, "2026-01-02")]);
    expect(s.net).toBe(-200);
    expect(s.savingsRate).toBe(-200);
  });
});

describe("filterTransactions", () => {
  const list = [
    tx("expense", 10, "2026-01-01", "food", "Milk"),
    tx("expense", 20, "2026-01-31", "rent", "Flat"),
    tx("income", 30, "2026-02-01", "salary", "Pay"),
  ];
  it("treats date bounds as inclusive", () => {
    expect(filterTransactions(list, { from: "2026-01-01", to: "2026-01-31" })).toHaveLength(2);
  });
  it("searches descriptions case-insensitively", () => {
    expect(filterTransactions(list, { search: "  milk " })).toHaveLength(1);
  });
  it("searches category labels", () => {
    expect(filterTransactions(list, { search: "rent" }, (id) => id)).toHaveLength(1);
  });
  it("filters by type and category", () => {
    expect(filterTransactions(list, { type: "income" })).toHaveLength(1);
    expect(filterTransactions(list, { categoryId: "rent" })).toHaveLength(1);
    expect(filterTransactions(list, { type: "all", categoryId: "all" })).toHaveLength(3);
  });
  it("sorts newest first", () => {
    expect(sortNewestFirst(list)[0]!.date).toBe("2026-02-01");
  });
});

describe("spendingByCategory", () => {
  it("ranks categories, ignores income and computes shares", () => {
    const rows = spendingByCategory(
      [tx("expense", 75, "2026-01-01", "rent"), tx("expense", 25, "2026-01-01", "food"), tx("income", 999, "2026-01-01", "salary")],
      DEFAULT_CATEGORIES,
    );
    expect(rows.map((r) => [r.category.id, r.percentage])).toEqual([["rent", 75], ["food", 25]]);
  });
  it("returns nothing with no expenses", () => {
    expect(spendingByCategory([], DEFAULT_CATEGORIES)).toEqual([]);
  });
});

describe("monthlySeries", () => {
  it("includes months with no activity", () => {
    const series = monthlySeries([tx("income", 100, "2026-01-05")], ["2025-12", "2026-01"]);
    expect(series).toEqual([
      { month: "2025-12", income: 0, expense: 0, net: 0 },
      { month: "2026-01", income: 100, expense: 0, net: 100 },
    ]);
  });
});

describe("budgets", () => {
  it("classifies around the thresholds", () => {
    expect(budgetStatus(79, 100)).toBe("ok");
    expect(budgetStatus(80, 100)).toBe("warning");
    expect(budgetStatus(100, 100)).toBe("warning");
    expect(budgetStatus(100.01, 100)).toBe("over");
  });
  it("counts only that month's expenses in that category", () => {
    const budgets: Budget[] = [{ month: "2026-01", categoryId: "food", limit: 100 }];
    const rows = buildBudgetRows("2026-01", budgets, [
      tx("expense", 130, "2026-01-10", "food"),
      tx("expense", 500, "2026-02-01", "food"),
      tx("expense", 500, "2026-01-10", "rent"),
      tx("income", 500, "2026-01-10", "food"),
    ], DEFAULT_CATEGORIES);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ spent: 130, remaining: -30, percentage: 130, status: "over" });
  });
  it("ignores budgets for other months or deleted categories", () => {
    const budgets: Budget[] = [
      { month: "2026-02", categoryId: "food", limit: 100 },
      { month: "2026-01", categoryId: "gone", limit: 100 },
    ];
    expect(buildBudgetRows("2026-01", budgets, [], DEFAULT_CATEGORIES)).toEqual([]);
  });
  it("alerts only on the change that crosses the limit", () => {
    expect(crossedLimit(90, 110, 100)).toBe(true);
    expect(crossedLimit(100, 100.5, 100)).toBe(true);
    expect(crossedLimit(110, 120, 100)).toBe(false);
    expect(crossedLimit(50, 100, 100)).toBe(false);
  });
  it("copies budgets without overwriting existing ones", () => {
    const budgets: Budget[] = [
      { month: "2026-01", categoryId: "food", limit: 100 },
      { month: "2026-01", categoryId: "rent", limit: 200 },
      { month: "2026-02", categoryId: "food", limit: 999 },
    ];
    expect(copyBudgets(budgets, "2026-01", "2026-02")).toEqual([{ month: "2026-02", categoryId: "rent", limit: 200 }]);
  });
});

describe("sample data", () => {
  const { transactions, budgets } = buildSampleData("2026-03-02", "PKR");
  it("is fully flagged so it can be labelled and removed", () => {
    expect(transactions.every((t) => t.isSample)).toBe(true);
    expect(budgets.every((b) => b.isSample)).toBe(true);
  });
  it("never contains future dates or invalid dates", () => {
    expect(transactions.every((t) => t.date <= "2026-03-02" && isValidISODate(t.date))).toBe(true);
  });
  it("uses only known categories with positive amounts", () => {
    const ids = new Set(DEFAULT_CATEGORIES.map((c) => c.id));
    expect(transactions.every((t) => ids.has(t.categoryId) && t.amount > 0)).toBe(true);
  });
  it("demonstrates every budget state", () => {
    const today = "2026-03-28";
    const sample = buildSampleData(today, "PKR");
    const statuses = buildBudgetRows("2026-03", sample.budgets, sample.transactions, DEFAULT_CATEGORIES).map((r) => r.status);
    expect(statuses).toEqual(expect.arrayContaining(["over", "warning", "ok"]));
  });
});

describe("LocalRepository", () => {
  const memory = () => {
    const map = new Map<string, string>();
    return {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
    };
  };
  it("starts with default categories and persists changes", async () => {
    const store = memory();
    const repo = new LocalRepository(store);
    const t = tx("expense", 10, "2026-01-01");
    await repo.upsertTransactions([t]);
    const reloaded = await new LocalRepository(store).load();
    expect(reloaded.transactions).toEqual([t]);
    expect(reloaded.categories).toEqual(DEFAULT_CATEGORIES);
  });
  it("updates in place and deletes", async () => {
    const repo = new LocalRepository(memory());
    const t = tx("expense", 10, "2026-01-01");
    await repo.upsertTransactions([t]);
    await repo.upsertTransactions([{ ...t, amount: 20 }]);
    expect((await repo.load()).transactions.map((x) => x.amount)).toEqual([20]);
    await repo.deleteTransactions([t.id]);
    expect((await repo.load()).transactions).toEqual([]);
  });
  it("removes a category's budgets along with it", async () => {
    const repo = new LocalRepository(memory());
    await repo.upsertBudgets([{ month: "2026-01", categoryId: "food", limit: 1 }]);
    await repo.deleteCategory("food");
    expect((await repo.load()).budgets).toEqual([]);
  });
  it("fails loudly on corrupted storage instead of wiping it", async () => {
    const store = memory();
    store.setItem("pfv:guest:v1", "{not json");
    await expect(new LocalRepository(store).load()).rejects.toThrow();
    expect(store.getItem("pfv:guest:v1")).toBe("{not json");
  });
});

describe("database row mapping", () => {
  it("round-trips a transaction, including string numerics", () => {
    const t = tx("expense", 12.5, "2026-01-01");
    const row = txToRow(t, "u1");
    expect(row.user_id).toBe("u1");
    expect(txFromRow({ ...row, amount: "12.50" })).toEqual(t);
  });
  it("round-trips a budget", () => {
    const b: Budget = { month: "2026-01", categoryId: "food", limit: 100 };
    expect(budFromRow({ ...budToRow(b, "u1"), amount_limit: "100.00" })).toEqual(b);
  });
});
