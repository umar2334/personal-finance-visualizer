import { createContext, useCallback, useContext, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { OTHER_EXPENSE_ID, OTHER_INCOME_ID } from "@/data/defaults";
import { useFinance } from "@/context/FinanceContext";
import { usePrefs } from "@/context/PrefsContext";
import { isValidISODate, todayISO } from "@/lib/dates";
import { MAX_AMOUNT, roundMoney } from "@/lib/money";
import type { Transaction, TxType } from "@/types";
import { Modal } from "./ui";

type Errors = Partial<Record<"amount" | "date" | "category" | "description", string>>;

function EntryForm({ entry, onClose }: { entry?: Transaction; onClose: () => void }) {
  const { t, categoryLabel, currency } = usePrefs();
  const { categories, saveEntry } = useFinance();
  const [type, setType] = useState<TxType>(entry?.type ?? "expense");
  const [amount, setAmount] = useState(entry ? String(entry.amount) : "");
  const [categoryId, setCategoryId] = useState(entry?.categoryId ?? OTHER_EXPENSE_ID);
  const [description, setDescription] = useState(entry?.description ?? "");
  const [date, setDate] = useState(entry?.date ?? todayISO());
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const options = categories.filter((c) => c.type === type).sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b)));

  const changeType = (next: TxType) => {
    setType(next);
    setCategoryId(next === "income" ? OTHER_INCOME_ID : OTHER_EXPENSE_ID);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    const next: Errors = {};
    if (!Number.isFinite(value) || value <= 0) next.amount = t("err_amount");
    else if (value > MAX_AMOUNT) next.amount = t("err_amount_big");
    if (!isValidISODate(date)) next.date = t("err_date");
    if (!options.some((c) => c.id === categoryId)) next.category = t("err_category");
    if (!description.trim()) next.description = t("err_description");
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSaving(true);
    const ok = await saveEntry({ type, amount: roundMoney(value), categoryId, description: description.trim(), date }, entry?.id);
    setSaving(false);
    if (ok) {
      toast.success(t(entry ? "entry_updated" : "entry_added"));
      onClose();
    }
  };

  return (
    <Modal title={t(entry ? "edit_entry" : "add_entry")} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <fieldset>
          <legend className="label">{t("type")}</legend>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1">
            {(["expense", "income"] as const).map((option) => (
              <label key={option} className={`cursor-pointer rounded-md py-2 text-center text-sm font-medium has-focus-visible:outline-2 has-focus-visible:outline-primary ${type === option ? (option === "income" ? "bg-income-soft text-income" : "bg-expense-soft text-expense") : "text-muted"}`}>
                <input type="radio" name="type" className="sr-only" checked={type === option} onChange={() => changeType(option)} />
                {t(option)}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="entry-amount" className="label">{t("amount")} ({currency})</label>
          <input id="entry-amount" className="field" dir="ltr" type="number" inputMode="decimal" min="0" step="0.01" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={Boolean(errors.amount)} />
          {errors.amount && <p role="alert" className="field-error">{errors.amount}</p>}
        </div>
        <div>
          <label htmlFor="entry-description" className="label">{t("description")}</label>
          <input id="entry-description" className="field" maxLength={140} placeholder={t("description_ph")} value={description} onChange={(e) => setDescription(e.target.value)} aria-invalid={Boolean(errors.description)} />
          {errors.description && <p role="alert" className="field-error">{errors.description}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="entry-category" className="label">{t("category")}</label>
            <select id="entry-category" className="field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-invalid={Boolean(errors.category)}>
              {options.map((c) => <option key={c.id} value={c.id}>{categoryLabel(c)}</option>)}
            </select>
            {errors.category && <p role="alert" className="field-error">{errors.category}</p>}
          </div>
          <div>
            <label htmlFor="entry-date" className="label">{t("date")}</label>
            <input id="entry-date" className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={Boolean(errors.date)} />
            {errors.date && <p role="alert" className="field-error">{errors.date}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose}>{t("cancel")}</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? t("working") : t("save")}</button>
        </div>
      </form>
    </Modal>
  );
}

interface EntryModalValue {
  openNew: () => void;
  openEdit: (entry: Transaction) => void;
}

const EntryModalContext = createContext<EntryModalValue | null>(null);

export function EntryModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ entry?: Transaction } | null>(null);
  const openNew = useCallback(() => setState({}), []);
  const openEdit = useCallback((entry: Transaction) => setState({ entry }), []);
  const value = useMemo(() => ({ openNew, openEdit }), [openNew, openEdit]);
  return (
    <EntryModalContext.Provider value={value}>
      {children}
      {state && <EntryForm entry={state.entry} onClose={() => setState(null)} />}
    </EntryModalContext.Provider>
  );
}

export function useEntryModal() {
  const ctx = useContext(EntryModalContext);
  if (!ctx) throw new Error("useEntryModal must be used inside EntryModalProvider");
  return ctx;
}
