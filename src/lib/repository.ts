import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_CATEGORIES } from "@/data/defaults";
import type { Budget, Category, FinanceData, Transaction } from "@/types";

/** The UI talks to this interface, so guest and account mode share all app logic. */
export interface FinanceRepository {
  load(): Promise<FinanceData>;
  upsertTransactions(items: Transaction[]): Promise<void>;
  deleteTransactions(ids: string[]): Promise<void>;
  upsertCategories(items: Category[]): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  upsertBudgets(items: Budget[]): Promise<void>;
  deleteBudgets(items: Pick<Budget, "month" | "categoryId">[]): Promise<void>;
  /** Removes entries and budgets, keeps categories. */
  clearEntries(): Promise<void>;
}

export const GUEST_STORAGE_KEY = "pfv:guest:v1";

type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export class LocalRepository implements FinanceRepository {
  constructor(private store: KeyValueStore, private key = GUEST_STORAGE_KEY) {}

  private read(): FinanceData {
    const raw = this.store.getItem(this.key);
    if (!raw) return { transactions: [], categories: DEFAULT_CATEGORIES, budgets: [] };
    const data = JSON.parse(raw) as FinanceData;
    if (!Array.isArray(data.transactions) || !Array.isArray(data.categories) || !Array.isArray(data.budgets)) {
      throw new Error("Saved data has an unexpected shape");
    }
    return data;
  }

  private update(change: (data: FinanceData) => FinanceData): Promise<void> {
    return new Promise((resolve) => {
      this.store.setItem(this.key, JSON.stringify(change(this.read())));
      resolve();
    });
  }

  async load() {
    return this.read();
  }

  upsertTransactions(items: Transaction[]) {
    const ids = new Set(items.map((t) => t.id));
    return this.update((d) => ({ ...d, transactions: [...d.transactions.filter((t) => !ids.has(t.id)), ...items] }));
  }

  deleteTransactions(ids: string[]) {
    const remove = new Set(ids);
    return this.update((d) => ({ ...d, transactions: d.transactions.filter((t) => !remove.has(t.id)) }));
  }

  upsertCategories(items: Category[]) {
    const ids = new Set(items.map((c) => c.id));
    return this.update((d) => ({ ...d, categories: [...d.categories.filter((c) => !ids.has(c.id)), ...items] }));
  }

  deleteCategory(id: string) {
    return this.update((d) => ({
      ...d,
      categories: d.categories.filter((c) => c.id !== id),
      budgets: d.budgets.filter((b) => b.categoryId !== id),
    }));
  }

  upsertBudgets(items: Budget[]) {
    const key = (b: Pick<Budget, "month" | "categoryId">) => `${b.month}|${b.categoryId}`;
    const keys = new Set(items.map(key));
    return this.update((d) => ({ ...d, budgets: [...d.budgets.filter((b) => !keys.has(key(b))), ...items] }));
  }

  deleteBudgets(items: Pick<Budget, "month" | "categoryId">[]) {
    const keys = new Set(items.map((b) => `${b.month}|${b.categoryId}`));
    return this.update((d) => ({ ...d, budgets: d.budgets.filter((b) => !keys.has(`${b.month}|${b.categoryId}`)) }));
  }

  clearEntries() {
    return this.update((d) => ({ ...d, transactions: [], budgets: [] }));
  }

  reset() {
    this.store.removeItem(this.key);
  }
}

const TX = "pfv_transactions";
const CAT = "pfv_categories";
const BUD = "pfv_budgets";
const PAGE = 1000;
const CHUNK = 500;

interface TxRow { id: string; user_id: string; type: Transaction["type"]; amount: number | string; category_id: string; description: string; date: string; created_at: string }
interface CatRow { id: string; user_id: string; name: string; type: Category["type"]; color: string; is_default: boolean }
interface BudRow { user_id: string; month: string; category_id: string; amount_limit: number | string }

/** Postgres `numeric` can arrive as a string, hence the Number() calls. */
export const txFromRow = (r: TxRow): Transaction => ({
  id: r.id, type: r.type, amount: Number(r.amount), categoryId: r.category_id,
  description: r.description, date: r.date, createdAt: r.created_at,
});
export const txToRow = (t: Transaction, userId: string): TxRow => ({
  id: t.id, user_id: userId, type: t.type, amount: t.amount, category_id: t.categoryId,
  description: t.description, date: t.date, created_at: t.createdAt,
});
export const catFromRow = (r: CatRow): Category => ({
  id: r.id, name: r.name, type: r.type, color: r.color, isDefault: r.is_default,
});
export const catToRow = (c: Category, userId: string): CatRow => ({
  id: c.id, user_id: userId, name: c.name, type: c.type, color: c.color, is_default: c.isDefault,
});
export const budFromRow = (r: BudRow): Budget => ({
  month: r.month, categoryId: r.category_id, limit: Number(r.amount_limit),
});
export const budToRow = (b: Budget, userId: string): BudRow => ({
  user_id: userId, month: b.month, category_id: b.categoryId, amount_limit: b.limit,
});

/** Row-level security in supabase/schema.sql is what actually isolates users; user_id here only satisfies it. */
export class SupabaseRepository implements FinanceRepository {
  constructor(private client: SupabaseClient, private userId: string) {}

  /** PostgREST caps each response, so read page by page. */
  private async selectAll<T>(table: string, order: string): Promise<T[]> {
    const all: T[] = [];
    for (let start = 0; ; start += PAGE) {
      const { data, error } = await this.client
        .from(table).select("*").eq("user_id", this.userId).order(order).range(start, start + PAGE - 1);
      if (error) throw error;
      all.push(...(data as T[]));
      if (data.length < PAGE) return all;
    }
  }

  private async upsert(table: string, rows: object[], onConflict: string) {
    for (let i = 0; i < rows.length; i += CHUNK) {
      const { error } = await this.client.from(table).upsert(rows.slice(i, i + CHUNK), { onConflict });
      if (error) throw error;
    }
  }

  async load(): Promise<FinanceData> {
    const [txs, cats, buds] = await Promise.all([
      this.selectAll<TxRow>(TX, "id"),
      this.selectAll<CatRow>(CAT, "id"),
      this.selectAll<BudRow>(BUD, "month"),
    ]);
    let categories = cats.map(catFromRow);
    if (categories.length === 0) {
      await this.upsertCategories(DEFAULT_CATEGORIES);
      categories = DEFAULT_CATEGORIES;
    }
    return { transactions: txs.map(txFromRow), categories, budgets: buds.map(budFromRow) };
  }

  upsertTransactions(items: Transaction[]) {
    return this.upsert(TX, items.map((t) => txToRow(t, this.userId)), "id");
  }

  async deleteTransactions(ids: string[]) {
    for (let i = 0; i < ids.length; i += CHUNK) {
      const { error } = await this.client.from(TX).delete().eq("user_id", this.userId).in("id", ids.slice(i, i + CHUNK));
      if (error) throw error;
    }
  }

  upsertCategories(items: Category[]) {
    return this.upsert(CAT, items.map((c) => catToRow(c, this.userId)), "user_id,id");
  }

  async deleteCategory(id: string) {
    const { error } = await this.client.from(CAT).delete().eq("user_id", this.userId).eq("id", id);
    if (error) throw error;
  }

  upsertBudgets(items: Budget[]) {
    return this.upsert(BUD, items.map((b) => budToRow(b, this.userId)), "user_id,month,category_id");
  }

  async deleteBudgets(items: Pick<Budget, "month" | "categoryId">[]) {
    for (const b of items) {
      const { error } = await this.client.from(BUD).delete()
        .eq("user_id", this.userId).eq("month", b.month).eq("category_id", b.categoryId);
      if (error) throw error;
    }
  }

  async clearEntries() {
    for (const table of [TX, BUD]) {
      const { error } = await this.client.from(table).delete().eq("user_id", this.userId);
      if (error) throw error;
    }
  }
}
