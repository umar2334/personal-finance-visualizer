import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Download, Pencil, Plus, Receipt, Search, SearchX, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { useEntryModal } from "@/components/EntryModal";
import { ImportModal } from "@/components/ImportModal";
import { CategoryDot, ConfirmDialog, EmptyState, Money, PageHeader } from "@/components/ui";
import { useFinance } from "@/context/FinanceContext";
import { usePrefs } from "@/context/PrefsContext";
import { filterTransactions, sortNewestFirst, summarize } from "@/lib/calculations";
import { downloadFile, toCsv } from "@/lib/csv";
import { formatDate, resolvePreset, todayISO, type RangePreset } from "@/lib/dates";
import type { Transaction, TxType } from "@/types";

const PAGE_SIZE = 50;

export default function Transactions() {
  const { t, lang, categoryLabel } = usePrefs();
  const { transactions, categories, category, deleteEntry } = useFinance();
  const { openNew, openEdit } = useEntryModal();
  // Filters live in the URL so a filtered view survives refresh and can be shared.
  const [params, setParams] = useSearchParams();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  const urlSearch = params.get("q") ?? "";
  // The box keeps its own text: router updates are async, so binding it directly
  // to the URL makes fast typing lose characters. The URL follows after a pause.
  const [search, setSearch] = useState(urlSearch);
  const type = (params.get("type") ?? "all") as TxType | "all";
  const categoryId = params.get("category") ?? "all";
  const preset = (params.get("range") ?? "all") as RangePreset;
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  const setParam = (change: Record<string, string>) => {
    setLimit(PAGE_SIZE);
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(change)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    if (search === urlSearch) return;
    const timer = setTimeout(() => setParam({ q: search }), 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `setParam` is recreated each render and only uses stable setters.
  }, [search, urlSearch]);

  const label = (id: string) => {
    const c = category(id);
    return c ? categoryLabel(c) : "";
  };
  const range = preset === "custom" ? { from, to } : resolvePreset(preset, todayISO());
  const filtered = useMemo(
    () => sortNewestFirst(filterTransactions(transactions, { ...range, search, type, categoryId }, label)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `label` only changes with `category` and language.
    [transactions, range.from, range.to, search, type, categoryId, category, categoryLabel],
  );
  const summary = useMemo(() => summarize(filtered), [filtered]);
  const isFiltered = Boolean(search || type !== "all" || categoryId !== "all" || preset !== "all");

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast.info(t("nothing_to_export"));
      return;
    }
    downloadFile(`transactions-${todayISO()}.csv`, toCsv(filtered, label));
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const id = deleting.id;
    setDeleting(null);
    if (await deleteEntry(id)) toast.success(t("entry_deleted"));
  };

  const options = [...categories].sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b)));

  return (
    <>
      <PageHeader title={t("tx_title")} subtitle={t("tx_count", { n: filtered.length })}>
        <button type="button" className="btn-secondary" onClick={() => setImporting(true)}><Upload size={16} />{t("import_csv")}</button>
        <button type="button" className="btn-secondary" onClick={exportCsv}><Download size={16} />{t("export_csv")}</button>
      </PageHeader>

      {transactions.length === 0 ? (
        <div className="card">
          <EmptyState icon={Receipt} title={t("no_tx_title")} body={t("no_tx_body")}>
            <button type="button" className="btn-primary" onClick={openNew}><Plus size={16} />{t("start_empty")}</button>
            <button type="button" className="btn-secondary" onClick={() => setImporting(true)}><Upload size={16} />{t("import_csv")}</button>
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="card mb-4 flex flex-wrap items-end gap-2 p-3">
            <label className="relative min-w-52 flex-1">
              <span className="sr-only">{t("search_placeholder")}</span>
              <Search size={16} className="absolute start-3 top-3 text-muted" />
              <input type="search" className="field ps-9" placeholder={t("search_placeholder")} value={search} onChange={(e) => { setLimit(PAGE_SIZE); setSearch(e.target.value); }} />
            </label>
            <select aria-label={t("type")} className="field min-w-32 flex-1 sm:w-36 sm:flex-none" value={type} onChange={(e) => setParam({ type: e.target.value === "all" ? "" : e.target.value })}>
              <option value="all">{t("all_types")}</option>
              <option value="income">{t("income")}</option>
              <option value="expense">{t("expense")}</option>
            </select>
            <select aria-label={t("category")} className="field min-w-40 flex-1 sm:w-44 sm:flex-none" value={categoryId} onChange={(e) => setParam({ category: e.target.value === "all" ? "" : e.target.value })}>
              <option value="all">{t("all_categories")}</option>
              {options.map((c) => <option key={c.id} value={c.id}>{categoryLabel(c)}</option>)}
            </select>
            <DateRangeFilter
              preset={preset} from={from} to={to}
              onPreset={(p) => setParam({ range: p === "all" ? "" : p, from: "", to: "" })}
              onCustom={(f, t2) => setParam({ from: f, to: t2 })}
            />
          </div>

          {filtered.length === 0 ? (
            <div className="card">
              <EmptyState icon={SearchX} title={t("no_match_title")} body={t("no_match_body")}>
                {isFiltered && <button type="button" className="btn-secondary" onClick={() => { setSearch(""); setParams({}, { replace: true }); }}>{t("clear_filters")}</button>}
              </EmptyState>
            </div>
          ) : (
            <>
              <dl className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <div className="flex gap-2"><dt className="text-muted">{t("income")}</dt><dd><Money value={summary.income} className="font-semibold text-income" /></dd></div>
                <div className="flex gap-2"><dt className="text-muted">{t("expense")}</dt><dd><Money value={summary.expense} className="font-semibold text-expense" /></dd></div>
                <div className="flex gap-2"><dt className="text-muted">{t("net")}</dt><dd><Money value={summary.net} className="font-semibold" /></dd></div>
              </dl>

              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="hidden bg-surface-2 text-xs text-muted sm:table-header-group">
                    <tr>
                      <th scope="col" className="px-4 py-2.5 text-start font-medium">{t("col_date")}</th>
                      <th scope="col" className="px-4 py-2.5 text-start font-medium">{t("col_description")}</th>
                      <th scope="col" className="px-4 py-2.5 text-start font-medium">{t("col_category")}</th>
                      <th scope="col" className="px-4 py-2.5 text-end font-medium">{t("col_amount")}</th>
                      <th scope="col" className="px-4 py-2.5 text-end font-medium"><span className="sr-only">{t("col_actions")}</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, limit).map((tx) => {
                      const cat = category(tx.categoryId);
                      return (
                        <tr key={tx.id} className="grid grid-cols-[1fr_auto] items-center gap-x-2 border-t border-line px-4 py-3 first:border-t-0 sm:table-row sm:p-0">
                          <td className="col-start-1 row-start-2 text-xs text-muted sm:px-4 sm:py-2.5 sm:text-sm sm:whitespace-nowrap sm:text-ink">{formatDate(tx.date, lang)}</td>
                          <td className="col-start-1 row-start-1 min-w-0 font-medium sm:max-w-64 sm:truncate sm:px-4 sm:py-2.5 sm:font-normal">{tx.description || t("no_description")}</td>
                          <td className="col-start-1 row-start-3 sm:px-4 sm:py-2.5">
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted sm:text-sm sm:text-ink"><CategoryDot color={cat?.color ?? "#64748b"} />{cat ? categoryLabel(cat) : ""}</span>
                          </td>
                          <td className="col-start-2 row-start-1 text-end sm:px-4 sm:py-2.5 sm:whitespace-nowrap">
                            <Money value={tx.amount} sign={tx.type === "income" ? "+" : "-"} className={`font-semibold ${tx.type === "income" ? "text-income" : "text-expense"}`} />
                          </td>
                          <td className="col-start-2 row-span-2 row-start-2 text-end sm:px-2 sm:py-1 sm:whitespace-nowrap">
                            <button type="button" className="btn-icon" aria-label={`${t("edit")}: ${tx.description}`} onClick={() => openEdit(tx)}><Pencil size={16} /></button>
                            <button type="button" className="btn-icon" aria-label={`${t("delete")}: ${tx.description}`} onClick={() => setDeleting(tx)}><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filtered.length > limit && (
                <div className="mt-4 text-center">
                  <button type="button" className="btn-secondary" onClick={() => setLimit((l) => l + PAGE_SIZE)}>{t("show_more", { n: filtered.length - limit })}</button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {importing && <ImportModal onClose={() => setImporting(false)} />}
      {deleting && (
        <ConfirmDialog
          title={t("delete_entry_title")}
          body={t("delete_entry_body", { name: deleting.description })}
          confirmLabel={t("delete")}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
