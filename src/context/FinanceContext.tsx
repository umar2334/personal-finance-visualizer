import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CATEGORY_COLORS, DEFAULT_CATEGORIES, OTHER_EXPENSE_ID, OTHER_INCOME_ID, buildSampleData } from "@/data/defaults";
import { copyBudgets, crossedLimit, spentInMonth } from "@/lib/budgets";
import { monthOf, todayISO } from "@/lib/dates";
import { LocalRepository, SupabaseRepository, type FinanceRepository } from "@/lib/repository";
import { supabase } from "@/lib/supabase";
import type { Budget, Category, FinanceData, Transaction, TxType } from "@/types";
import { useAuth } from "./AuthContext";
import { usePrefs } from "./PrefsContext";

export type EntryInput = Pick<Transaction, "type" | "amount" | "categoryId" | "description" | "date">;
export type ImportEntry = Omit<EntryInput, "categoryId"> & { categoryName: string };

interface FinanceValue extends FinanceData {
  status: "loading" | "ready" | "error";
  isGuest: boolean;
  hasSample: boolean;
  /** Entries left in this browser's guest storage while signed in. */
  guestEntryCount: number;
  reload: () => void;
  resetLocal: () => void;
  saveEntry: (input: EntryInput, id?: string) => Promise<boolean>;
  deleteEntry: (id: string) => Promise<boolean>;
  importEntries: (entries: ImportEntry[]) => Promise<boolean>;
  saveCategory: (category: Category) => Promise<boolean>;
  deleteCategory: (category: Category) => Promise<boolean>;
  setBudget: (month: string, categoryId: string, limit: number | null) => Promise<boolean>;
  copyBudgetsFrom: (from: string, to: string) => Promise<number>;
  loadSample: () => Promise<void>;
  removeSample: () => Promise<void>;
  clearEntries: () => Promise<void>;
  moveGuestEntries: () => Promise<number>;
  category: (id: string) => Category | undefined;
}

const empty: FinanceData = { transactions: [], categories: DEFAULT_CATEGORIES, budgets: [] };

function guestRepository() {
  return new LocalRepository(window.localStorage);
}

const FinanceContext = createContext<FinanceValue | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { t, currency, categoryLabel } = usePrefs();
  const [data, setData] = useState<FinanceData>(empty);
  const [status, setStatus] = useState<FinanceValue["status"]>("loading");
  const [guestEntryCount, setGuestEntryCount] = useState(0);
  const [version, setVersion] = useState(0);

  const userId = user?.id;
  const repo = useMemo<FinanceRepository | null>(() => {
    if (authLoading) return null;
    return userId && supabase ? new SupabaseRepository(supabase, userId) : guestRepository();
  }, [authLoading, userId]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!repo) return;
    let cancelled = false;
    setStatus("loading");
    repo.load()
      .then((loaded) => {
        if (cancelled) return;
        setData(loaded);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    if (userId) {
      guestRepository().load()
        .then((guest) => !cancelled && setGuestEntryCount(guest.transactions.filter((tx) => !tx.isSample).length))
        .catch(() => undefined);
    } else {
      setGuestEntryCount(0);
    }
    return () => {
      cancelled = true;
    };
  }, [repo, userId, version]);

  /**
   * Updates the screen first so the app feels instant, then saves. If the save
   * fails, the source of truth is reloaded rather than guessing how to undo.
   */
  const commit = useCallback(async (change: (d: FinanceData) => FinanceData, persist: (r: FinanceRepository) => Promise<void>) => {
    if (!repo) return false;
    setData(change);
    try {
      await persist(repo);
      return true;
    } catch {
      toast.error(t("error_save"));
      reload();
      return false;
    }
  }, [repo, reload, t]);

  const saveEntry = useCallback<FinanceValue["saveEntry"]>(async (input, id) => {
    const existing = id ? data.transactions.find((tx) => tx.id === id) : undefined;
    const entry: Transaction = {
      ...input,
      id: existing?.id ?? crypto.randomUUID(),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      ...(existing?.isSample ? { isSample: true } : {}),
    };
    const month = monthOf(entry.date);
    const budget = data.budgets.find((b) => b.month === month && b.categoryId === entry.categoryId);
    const others = data.transactions.filter((tx) => tx.id !== entry.id);
    const ok = await commit(
      (d) => ({ ...d, transactions: [...d.transactions.filter((tx) => tx.id !== entry.id), entry] }),
      (r) => r.upsertTransactions([entry]),
    );
    if (ok && budget && entry.type === "expense") {
      const before = spentInMonth(data.transactions, month, entry.categoryId);
      const after = spentInMonth([...others, entry], month, entry.categoryId);
      if (crossedLimit(before, after, budget.limit)) {
        const cat = data.categories.find((c) => c.id === entry.categoryId);
        if (cat) toast.warning(t("over_budget_toast", { cat: categoryLabel(cat) }));
      }
    }
    return ok;
  }, [commit, data, t, categoryLabel]);

  const deleteEntry = useCallback<FinanceValue["deleteEntry"]>((id) => (
    commit((d) => ({ ...d, transactions: d.transactions.filter((tx) => tx.id !== id) }), (r) => r.deleteTransactions([id]))
  ), [commit]);

  const importEntries = useCallback<FinanceValue["importEntries"]>(async (entries) => {
    const categories = [...data.categories];
    const created: Category[] = [];
    const resolve = (name: string, type: TxType) => {
      if (!name) return type === "income" ? OTHER_INCOME_ID : OTHER_EXPENSE_ID;
      const lower = name.toLowerCase();
      const match = categories.find((c) => c.type === type && (c.name.toLowerCase() === lower || categoryLabel(c).toLowerCase() === lower));
      if (match) return match.id;
      const fresh: Category = { id: crypto.randomUUID(), name: name.slice(0, 40), type, color: CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length]!, isDefault: false };
      categories.push(fresh);
      created.push(fresh);
      return fresh.id;
    };
    const now = new Date().toISOString();
    const items: Transaction[] = entries.map(({ categoryName, ...e }) => ({
      ...e, categoryId: resolve(categoryName, e.type), id: crypto.randomUUID(), createdAt: now,
    }));
    return commit(
      (d) => ({ ...d, categories, transactions: [...d.transactions, ...items] }),
      async (r) => {
        if (created.length) await r.upsertCategories(created);
        await r.upsertTransactions(items);
      },
    );
  }, [commit, data.categories, categoryLabel]);

  const saveCategory = useCallback<FinanceValue["saveCategory"]>((category) => (
    commit(
      (d) => ({ ...d, categories: [...d.categories.filter((c) => c.id !== category.id), category] }),
      (r) => r.upsertCategories([category]),
    )
  ), [commit]);

  const deleteCategory = useCallback<FinanceValue["deleteCategory"]>(async (category) => {
    const fallback = category.type === "income" ? OTHER_INCOME_ID : OTHER_EXPENSE_ID;
    const moved = data.transactions.filter((tx) => tx.categoryId === category.id).map((tx) => ({ ...tx, categoryId: fallback }));
    const ids = new Set(moved.map((tx) => tx.id));
    return commit(
      (d) => ({
        ...d,
        categories: d.categories.filter((c) => c.id !== category.id),
        budgets: d.budgets.filter((b) => b.categoryId !== category.id),
        transactions: [...d.transactions.filter((tx) => !ids.has(tx.id)), ...moved],
      }),
      async (r) => {
        // Entries must move first: the database rejects deleting a category still in use.
        if (moved.length) await r.upsertTransactions(moved);
        await r.deleteCategory(category.id);
      },
    );
  }, [commit, data.transactions]);

  const setBudget = useCallback<FinanceValue["setBudget"]>(async (month, categoryId, limit) => {
    const without = (d: FinanceData) => d.budgets.filter((b) => !(b.month === month && b.categoryId === categoryId));
    if (limit === null) {
      return commit((d) => ({ ...d, budgets: without(d) }), (r) => r.deleteBudgets([{ month, categoryId }]));
    }
    const budget: Budget = { month, categoryId, limit };
    return commit((d) => ({ ...d, budgets: [...without(d), budget] }), (r) => r.upsertBudgets([budget]));
  }, [commit]);

  const copyBudgetsFrom = useCallback<FinanceValue["copyBudgetsFrom"]>(async (from, to) => {
    const copies = copyBudgets(data.budgets, from, to);
    if (copies.length === 0) return 0;
    const ok = await commit((d) => ({ ...d, budgets: [...d.budgets, ...copies] }), (r) => r.upsertBudgets(copies));
    return ok ? copies.length : 0;
  }, [commit, data.budgets]);

  const loadSample = useCallback(async () => {
    const sample = buildSampleData(todayISO(), currency);
    const ok = await commit(
      (d) => ({ ...d, transactions: [...d.transactions, ...sample.transactions], budgets: [...d.budgets, ...sample.budgets] }),
      async (r) => {
        await r.upsertTransactions(sample.transactions);
        await r.upsertBudgets(sample.budgets);
      },
    );
    if (ok) toast.success(t("sample_loaded"));
  }, [commit, currency, t]);

  const removeSample = useCallback(async () => {
    const ids = data.transactions.filter((tx) => tx.isSample).map((tx) => tx.id);
    const buds = data.budgets.filter((b) => b.isSample);
    const ok = await commit(
      (d) => ({ ...d, transactions: d.transactions.filter((tx) => !tx.isSample), budgets: d.budgets.filter((b) => !b.isSample) }),
      async (r) => {
        await r.deleteTransactions(ids);
        await r.deleteBudgets(buds);
      },
    );
    if (ok) toast.success(t("sample_removed"));
  }, [commit, data.budgets, data.transactions, t]);

  const clearEntries = useCallback(async () => {
    const ok = await commit((d) => ({ ...d, transactions: [], budgets: [] }), (r) => r.clearEntries());
    if (ok) toast.success(t("cleared"));
  }, [commit, t]);

  const moveGuestEntries = useCallback(async () => {
    const local = guestRepository();
    const guest = await local.load();
    const entries = guest.transactions.filter((tx) => !tx.isSample);
    const entryIds = new Set(entries.map((tx) => tx.id));
    const usedCategories = new Set(entries.map((tx) => tx.categoryId));
    // Includes built-ins, since the account may have deleted one the entries still use.
    const used = guest.categories.filter((c) => usedCategories.has(c.id));
    const ok = await commit(
      (d) => ({
        ...d,
        categories: [...d.categories.filter((c) => !used.some((x) => x.id === c.id)), ...used],
        transactions: [...d.transactions.filter((tx) => !entryIds.has(tx.id)), ...entries],
      }),
      async (r) => {
        if (used.length) await r.upsertCategories(used);
        await r.upsertTransactions(entries);
      },
    );
    if (!ok) return 0;
    // The guest copy is removed only after the account has safely received it.
    local.reset();
    setGuestEntryCount(0);
    return entries.length;
  }, [commit]);

  const resetLocal = useCallback(() => {
    guestRepository().reset();
    reload();
  }, [reload]);

  const value = useMemo<FinanceValue>(() => ({
    ...data,
    status: authLoading ? "loading" : status,
    isGuest: !userId,
    hasSample: data.transactions.some((tx) => tx.isSample),
    guestEntryCount,
    reload,
    resetLocal,
    saveEntry,
    deleteEntry,
    importEntries,
    saveCategory,
    deleteCategory,
    setBudget,
    copyBudgetsFrom,
    loadSample,
    removeSample,
    clearEntries,
    moveGuestEntries,
    category: (id) => data.categories.find((c) => c.id === id),
  }), [data, authLoading, status, userId, guestEntryCount, reload, resetLocal, saveEntry, deleteEntry, importEntries, saveCategory, deleteCategory, setBudget, copyBudgetsFrom, loadSample, removeSample, clearEntries, moveGuestEntries]);

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used inside FinanceProvider");
  return ctx;
}
