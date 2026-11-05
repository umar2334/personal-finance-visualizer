import { useMemo, useState, type ChangeEvent } from "react";
import { CheckCircle2, Download, TriangleAlert, Upload } from "lucide-react";
import { toast } from "sonner";
import { useFinance } from "@/context/FinanceContext";
import { usePrefs } from "@/context/PrefsContext";
import type { TranslationKey } from "@/i18n/translations";
import { CSV_TEMPLATE, MAX_IMPORT_BYTES, MAX_IMPORT_ROWS, downloadFile, findDuplicateLines, findNewCategories, parseTransactionsCsv, type ParseResult } from "@/lib/csv";
import { formatDate } from "@/lib/dates";
import { Modal, Money } from "./ui";

const PREVIEW_ROWS = 6;
const ERROR_ROWS = 20;

export function ImportModal({ onClose }: { onClose: () => void }) {
  const { t, lang, categoryLabel } = usePrefs();
  const { transactions, categories, importEntries } = useFinance();
  const [fileError, setFileError] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importing, setImporting] = useState(false);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setResult(null);
    setFileName(file.name);
    if (file.size > MAX_IMPORT_BYTES) {
      setFileError(t("csv_too_big"));
      return;
    }
    try {
      const parsed = parseTransactionsCsv(await file.text());
      if (parsed.fatal) {
        setFileError(t(`csv_${parsed.fatal}` as TranslationKey, { n: MAX_IMPORT_ROWS }));
        return;
      }
      setFileError("");
      setResult(parsed);
    } catch {
      setFileError(t("csv_read_failed"));
    }
  };

  const duplicates = useMemo(() => (result ? findDuplicateLines(result.rows, transactions) : new Set<number>()), [result, transactions]);
  const rows = useMemo(
    () => (result?.rows ?? []).filter((r) => !(skipDuplicates && duplicates.has(r.line))),
    [result, skipDuplicates, duplicates],
  );
  const newCategories = useMemo(() => findNewCategories(rows, categories, categoryLabel), [rows, categories, categoryLabel]);

  const confirm = async () => {
    setImporting(true);
    const ok = await importEntries(rows.map(({ date, type, amount, categoryName, description }) => ({ date, type, amount, categoryName, description })));
    setImporting(false);
    if (ok) {
      toast.success(t("imported", { n: rows.length }));
      onClose();
    }
  };

  const picker = (
    <label className={result ? "btn-secondary" : "btn-primary"}>
      <Upload size={16} />
      {t(result || fileError ? "choose_other" : "choose_file")}
      <input type="file" accept=".csv,text/csv" className="sr-only" onChange={onFile} />
    </label>
  );

  return (
    <Modal title={t("import_title")} onClose={onClose} wide>
      {!result && (
        <>
          <p className="text-sm text-muted">{t("import_help")}</p>
          {fileError && (
            <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-expense-soft p-3 text-sm text-expense">
              <TriangleAlert size={16} className="mt-0.5 shrink-0" /><span><b dir="ltr">{fileName}</b>: {fileError}</span>
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {picker}
            <button type="button" className="btn-secondary" onClick={() => downloadFile("finance-template.csv", CSV_TEMPLATE)}>
              <Download size={16} />{t("download_template")}
            </button>
          </div>
        </>
      )}

      {result && (
        <div className="space-y-4">
          <p className="truncate text-sm text-muted" dir="ltr">{fileName}</p>
          {rows.length > 0 ? (
            <p className="flex items-center gap-2 rounded-lg bg-income-soft p-3 text-sm font-medium text-income">
              <CheckCircle2 size={16} className="shrink-0" />{t("import_ready", { n: rows.length })}
            </p>
          ) : (
            <p role="alert" className="flex items-center gap-2 rounded-lg bg-expense-soft p-3 text-sm text-expense">
              <TriangleAlert size={16} className="shrink-0" />{t("import_none")}
            </p>
          )}

          {duplicates.size > 0 && (
            <label className="flex items-start gap-2 rounded-lg bg-warning-soft p-3 text-sm text-warning">
              <input type="checkbox" className="mt-1" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} />
              <span>{t("import_duplicates", { n: duplicates.size })}. {t("skip_duplicates")}</span>
            </label>
          )}

          {newCategories.length > 0 && (
            <p className="text-sm text-muted">{t("import_new_cats", { names: newCategories.map((c) => c.name).join(", ") })}</p>
          )}

          {rows.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">{t("preview")}</h3>
              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full text-sm">
                  <thead className="bg-surface-2 text-xs text-muted">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-start font-medium">{t("col_date")}</th>
                      <th scope="col" className="px-3 py-2 text-start font-medium">{t("col_description")}</th>
                      <th scope="col" className="px-3 py-2 text-start font-medium">{t("col_category")}</th>
                      <th scope="col" className="px-3 py-2 text-end font-medium">{t("col_amount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, PREVIEW_ROWS).map((r) => (
                      <tr key={r.line} className="border-t border-line">
                        <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.date, lang)}</td>
                        <td className="max-w-48 truncate px-3 py-2">{r.description || "–"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{r.categoryName || "–"}</td>
                        <td className="px-3 py-2 text-end whitespace-nowrap">
                          <Money value={r.amount} sign={r.type === "income" ? "+" : "-"} className={r.type === "income" ? "text-income" : "text-expense"} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > PREVIEW_ROWS && <p className="mt-1 text-xs text-muted">{t("preview_more", { n: rows.length - PREVIEW_ROWS })}</p>}
            </div>
          )}

          {result.errors.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-expense">
                <TriangleAlert size={16} />{t("import_problem_rows", { n: result.errors.length })}
              </h3>
              <ul className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-line p-3 text-sm">
                {result.errors.slice(0, ERROR_ROWS).map((err) => (
                  <li key={err.line}>
                    <b>{t("line", { n: err.line })}:</b> {t(`csv_${err.code}` as TranslationKey, { value: err.value ?? "" })}
                  </li>
                ))}
                {result.errors.length > ERROR_ROWS && <li className="text-muted">{t("preview_more", { n: result.errors.length - ERROR_ROWS })}</li>}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            {picker}
            <button type="button" className="btn-primary" disabled={rows.length === 0 || importing} onClick={confirm}>
              {importing ? t("working") : t("import_button", { n: rows.length })}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
