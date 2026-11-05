import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight, Copy, PiggyBank, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CategoryDot, EmptyState, Modal, Money, PageHeader } from "@/components/ui";
import { useFinance } from "@/context/FinanceContext";
import { usePrefs } from "@/context/PrefsContext";
import { buildBudgetRows, spentInMonth, type BudgetStatus } from "@/lib/budgets";
import { addMonths, formatMonth, monthOf, todayISO } from "@/lib/dates";
import { MAX_AMOUNT, roundMoney, sumMoney } from "@/lib/money";
import type { Category } from "@/types";

const STATUS: Record<BudgetStatus, { bar: string; badge: string; key: "status_ok" | "status_warning" | "status_over" }> = {
  ok: { bar: "bg-income", badge: "bg-income-soft text-income", key: "status_ok" },
  warning: { bar: "bg-warning", badge: "bg-warning-soft text-warning", key: "status_warning" },
  over: { bar: "bg-expense", badge: "bg-expense-soft text-expense", key: "status_over" },
};

function BudgetForm({ month, category, current, onClose }: { month: string; category: Category; current?: number; onClose: () => void }) {
  const { t, lang, categoryLabel, currency } = usePrefs();
  const { setBudget } = useFinance();
  const [value, setValue] = useState(current ? String(current) : "");
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const limit = Number(value);
    if (!Number.isFinite(limit) || limit <= 0) return setError(t("err_amount"));
    if (limit > MAX_AMOUNT) return setError(t("err_amount_big"));
    if (await setBudget(month, category.id, roundMoney(limit))) toast.success(t("budget_saved"));
    onClose();
  };

  const remove = async () => {
    if (await setBudget(month, category.id, null)) toast.success(t("budget_removed"));
    onClose();
  };

  return (
    <Modal title={`${categoryLabel(category)} · ${formatMonth(month, lang)}`} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <label htmlFor="budget-limit" className="label">{t("budget_limit")} ({currency})</label>
        <input id="budget-limit" className="field" dir="ltr" type="number" min="0" step="0.01" inputMode="decimal" autoFocus value={value} onChange={(e) => setValue(e.target.value)} aria-invalid={Boolean(error)} />
        {error && <p role="alert" className="field-error">{error}</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {current !== undefined && <button type="button" className="btn-secondary me-auto text-expense" onClick={remove}><Trash2 size={16} />{t("remove")}</button>}
          <button type="button" className="btn-secondary" onClick={onClose}>{t("cancel")}</button>
          <button type="submit" className="btn-primary">{t("save")}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Budgets() {
  const { t, lang, money, categoryLabel } = usePrefs();
  const { budgets, transactions, categories, copyBudgetsFrom } = useFinance();
  const [month, setMonth] = useState(monthOf(todayISO()));
  const [editing, setEditing] = useState<Category | null>(null);

  const rows = useMemo(() => buildBudgetRows(month, budgets, transactions, categories), [month, budgets, transactions, categories]);
  const unbudgeted = categories
    .filter((c) => c.type === "expense" && !rows.some((r) => r.category.id === c.id))
    .sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b)));
  const totalLimit = sumMoney(rows.map((r) => r.limit));
  const totalSpent = sumMoney(rows.map((r) => r.spent));
  const left = sumMoney([totalLimit, -totalSpent]);

  const copy = async () => {
    const n = await copyBudgetsFrom(addMonths(month, -1), month);
    if (n > 0) toast.success(t("copied_n", { n }));
    else toast.info(t("nothing_to_copy"));
  };

  return (
    <>
      <PageHeader title={t("budgets_title")} subtitle={t("budgets_sub")}>
        <button type="button" className="btn-secondary" onClick={copy}><Copy size={16} />{t("copy_last_month")}</button>
      </PageHeader>

      <div className="mb-4 flex items-center justify-center gap-2">
        <button type="button" className="btn-icon" aria-label={t("prev_month")} onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft size={18} className="rtl:rotate-180" /></button>
        <h2 aria-live="polite" className="min-w-40 text-center font-semibold">{formatMonth(month, lang)}</h2>
        <button type="button" className="btn-icon" aria-label={t("next_month")} onClick={() => setMonth(addMonths(month, 1))}><ChevronRight size={18} className="rtl:rotate-180" /></button>
      </div>

      {rows.length === 0 ? (
        <div className="card mb-4"><EmptyState icon={PiggyBank} title={t("no_budgets_title")} body={t("no_budgets_body")} /></div>
      ) : (
        <>
          <dl className="mb-4 grid grid-cols-3 gap-3">
            <div className="card p-3 sm:p-4"><dt className="text-xs text-muted sm:text-sm">{t("budgeted")}</dt><dd className="mt-0.5 text-sm font-bold sm:text-xl"><Money value={totalLimit} /></dd></div>
            <div className="card p-3 sm:p-4"><dt className="text-xs text-muted sm:text-sm">{t("spent")}</dt><dd className="mt-0.5 text-sm font-bold sm:text-xl"><Money value={totalSpent} /></dd></div>
            <div className="card p-3 sm:p-4"><dt className="text-xs text-muted sm:text-sm">{t(left < 0 ? "overspent" : "remaining")}</dt><dd className="mt-0.5 text-sm font-bold sm:text-xl"><Money value={Math.abs(left)} className={left < 0 ? "text-expense" : ""} /></dd></div>
          </dl>
          <ul className="mb-4 grid gap-3 md:grid-cols-2">
            {rows.map((r) => {
              const s = STATUS[r.status];
              return (
                <li key={r.category.id}>
                  <button type="button" onClick={() => setEditing(r.category)} aria-label={`${t("edit_budget")}: ${categoryLabel(r.category)}`} className="card block w-full cursor-pointer p-4 text-start hover:bg-surface-2">
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2 font-medium"><CategoryDot color={r.category.color} /><span className="truncate">{categoryLabel(r.category)}</span></span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${s.badge}`}>{t(s.key)}</span>
                    </span>
                    <span role="progressbar" aria-valuenow={Math.min(r.percentage, 100)} aria-valuemin={0} aria-valuemax={100} aria-label={categoryLabel(r.category)} className="mt-3 block h-2 overflow-hidden rounded-full bg-surface-2">
                      <span className={`block h-full rounded-full ${s.bar}`} style={{ width: `${Math.min(r.percentage, 100)}%` }} />
                    </span>
                    <span className="mt-2 flex justify-between gap-2 text-xs text-muted sm:text-sm">
                      <span>{t("spent_of", { spent: money(r.spent), limit: money(r.limit) })}</span>
                      <span dir="ltr" className="font-medium tabular-nums">{r.percentage}%</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <section className="card">
        <h2 className="border-b border-line px-4 py-3 font-semibold">{t("no_budget")}</h2>
        {unbudgeted.length === 0 && categories.every((c) => c.type !== "expense") && (
          <p className="p-4 text-sm text-muted"><Link to="/settings" className="text-primary underline">{t("no_expense_categories")}</Link></p>
        )}
        <ul className="divide-y divide-line">
          {unbudgeted.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <span className="flex min-w-0 items-center gap-2"><CategoryDot color={c.color} /><span className="truncate">{categoryLabel(c)}</span></span>
              <span className="flex items-center gap-3">
                <Money value={spentInMonth(transactions, month, c.id)} className="text-muted" />
                <button type="button" className="btn-secondary !min-h-8 !px-3" onClick={() => setEditing(c)} aria-label={`${t("set_budget")}: ${categoryLabel(c)}`}>{t("set_budget")}</button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {editing && (
        <BudgetForm
          month={month}
          category={editing}
          current={budgets.find((b) => b.month === month && b.categoryId === editing.id)?.limit}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
