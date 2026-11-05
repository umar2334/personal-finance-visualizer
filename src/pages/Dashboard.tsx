import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowDownRight, ArrowUpRight, BarChart3, FlaskConical, PieChart as PieIcon, PiggyBank, Plus, Scale, TriangleAlert, Wallet } from "lucide-react";
import { CategoryChart, IncomeExpenseChart, TrendChart } from "@/components/Charts";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { useEntryModal } from "@/components/EntryModal";
import { CategoryDot, EmptyState, Money, PageHeader } from "@/components/ui";
import { useFinance } from "@/context/FinanceContext";
import { usePrefs } from "@/context/PrefsContext";
import { buildBudgetRows } from "@/lib/budgets";
import { filterTransactions, monthlySeries, sortNewestFirst, spendingByCategory, summarize } from "@/lib/calculations";
import { formatDate, lastMonths, monthOf, resolvePreset, todayISO, type RangePreset } from "@/lib/dates";

function Stat({ label, value, icon: Icon, tone, note }: { label: string; value: React.ReactNode; icon: typeof Wallet; tone: string; note?: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2 text-sm text-muted">
        {label}
        <span className={`flex size-8 items-center justify-center rounded-lg ${tone}`}><Icon size={16} /></span>
      </div>
      <div className="mt-1 text-xl font-bold sm:text-2xl">{value}</div>
      {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
    </div>
  );
}

function Panel({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="card p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function SampleBanner() {
  const { t } = usePrefs();
  const { removeSample } = useFinance();
  return (
    <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-warning-soft p-3 text-sm text-warning">
      <span className="flex items-center gap-2"><FlaskConical size={16} className="shrink-0" />{t("sample_banner")}</span>
      <button type="button" className="font-semibold underline" onClick={removeSample}>{t("remove_sample")}</button>
    </div>
  );
}

export default function Dashboard() {
  const { t, lang, money, categoryLabel } = usePrefs();
  const { transactions, categories, budgets, hasSample, loadSample, isGuest, category } = useFinance();
  const { openNew, openEdit } = useEntryModal();
  const [preset, setPreset] = useState<RangePreset>("this_month");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const today = todayISO();
  const range = preset === "custom" ? custom : resolvePreset(preset, today);

  const inRange = useMemo(() => filterTransactions(transactions, range), [transactions, range]);
  const summary = useMemo(() => summarize(inRange), [inRange]);
  const byCategory = useMemo(() => spendingByCategory(inRange, categories), [inRange, categories]);
  const series = useMemo(() => monthlySeries(transactions, lastMonths(monthOf(today), 6)), [transactions, today]);
  const alerts = useMemo(
    () => buildBudgetRows(monthOf(today), budgets, transactions, categories).filter((r) => r.status !== "ok"),
    [budgets, transactions, categories, today],
  );
  const recent = useMemo(() => sortNewestFirst(transactions).slice(0, 6), [transactions]);

  if (transactions.length === 0) {
    return (
      <div className="card">
        <EmptyState icon={BarChart3} title={t("welcome_title")} body={t("welcome_body")}>
          {isGuest && <button type="button" className="btn-primary" onClick={loadSample}><FlaskConical size={16} />{t("load_sample")}</button>}
          <button type="button" className={isGuest ? "btn-secondary" : "btn-primary"} onClick={openNew}><Plus size={16} />{t("start_empty")}</button>
        </EmptyState>
      </div>
    );
  }

  return (
    <>
      {hasSample && <SampleBanner />}
      <PageHeader title={t("nav_dashboard")}>
        <DateRangeFilter preset={preset} from={custom.from} to={custom.to} onPreset={setPreset} onCustom={(from, to) => setCustom({ from, to })} />
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("income")} icon={ArrowUpRight} tone="bg-income-soft text-income" value={<Money value={summary.income} />} />
        <Stat label={t("expense")} icon={ArrowDownRight} tone="bg-expense-soft text-expense" value={<Money value={summary.expense} />} />
        <Stat label={t("net")} icon={Scale} tone="bg-primary-soft text-primary" value={<Money value={summary.net} className={summary.net < 0 ? "text-expense" : ""} />} />
        <Stat
          label={t("savings_rate")} icon={PiggyBank} tone="bg-primary-soft text-primary"
          value={summary.savingsRate === null ? "–" : <span dir="ltr" className="inline-block">{summary.savingsRate}%</span>}
          note={summary.savingsRate === null ? t("no_income_rate") : t("of_income_kept")}
        />
      </div>

      {alerts.length > 0 && (
        <section aria-label={t("budget_alerts")} className="card mt-4 p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-semibold"><TriangleAlert size={16} className="text-warning" />{t("budget_alerts")}</h2>
            <Link to="/budgets" className="text-sm font-medium text-primary hover:underline">{t("manage_budgets")}</Link>
          </div>
          <ul className="space-y-1.5 text-sm">
            {alerts.map((r) => (
              <li key={r.category.id} className={`rounded-lg px-3 py-2 ${r.status === "over" ? "bg-expense-soft text-expense" : "bg-warning-soft text-warning"}`}>
                {r.status === "over"
                  ? t("alert_over", { cat: categoryLabel(r.category), amount: money(-r.remaining) })
                  : t("alert_near", { cat: categoryLabel(r.category), pct: r.percentage })}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title={t("chart_by_category")}>
          {byCategory.length > 0
            ? <CategoryChart rows={byCategory} total={summary.expense} />
            : <EmptyState icon={PieIcon} title={t("chart_empty")} />}
        </Panel>
        <Panel title={t("chart_income_vs_expense")} subtitle={t("last_6_months")}><IncomeExpenseChart data={series} /></Panel>
        <Panel title={t("chart_trend")} subtitle={t("chart_trend_sub")}><TrendChart data={series} /></Panel>
        <Panel title={t("recent")} action={<Link to="/transactions" className="text-sm font-medium text-primary hover:underline">{t("view_all")}</Link>}>
          <ul className="divide-y divide-line">
            {recent.map((tx) => {
              const cat = category(tx.categoryId);
              return (
                <li key={tx.id}>
                  <button type="button" onClick={() => openEdit(tx)} className="flex w-full cursor-pointer items-center gap-3 py-2 text-start text-sm hover:opacity-80">
                    <CategoryDot color={cat?.color ?? "#64748b"} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{tx.description || t("no_description")}</span>
                      <span className="block text-xs text-muted">{formatDate(tx.date, lang)} · {cat ? categoryLabel(cat) : ""}</span>
                    </span>
                    <Money value={tx.amount} sign={tx.type === "income" ? "+" : "-"} className={`font-medium ${tx.type === "income" ? "text-income" : "text-expense"}`} />
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </>
  );
}
