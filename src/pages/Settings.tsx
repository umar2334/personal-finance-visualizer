import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router";
import { FlaskConical, LogOut, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ImportModal } from "@/components/ImportModal";
import { CategoryDot, ConfirmDialog, Modal, PageHeader } from "@/components/ui";
import { CATEGORY_COLORS, DEFAULT_CATEGORIES, OTHER_EXPENSE_ID, OTHER_INCOME_ID } from "@/data/defaults";
import { useAuth } from "@/context/AuthContext";
import { useFinance } from "@/context/FinanceContext";
import { usePrefs } from "@/context/PrefsContext";
import { downloadFile, toCsv } from "@/lib/csv";
import { todayISO } from "@/lib/dates";
import type { Category, Currency, Lang, ThemeSetting, TxType } from "@/types";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card p-4 sm:p-5">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function CategoryForm({ category, type, onClose }: { category?: Category; type: TxType; onClose: () => void }) {
  const { t, categoryLabel } = usePrefs();
  const { categories, saveCategory } = useFinance();
  const [name, setName] = useState(category?.name ?? "");
  const [color, setColor] = useState(category?.color ?? CATEGORY_COLORS[0]!);
  const [error, setError] = useState("");
  const locked = category?.isDefault;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return setError(t("err_category_name"));
    const clash = categories.some((c) => c.id !== category?.id && c.type === type
      && (c.name.toLowerCase() === clean.toLowerCase() || categoryLabel(c).toLowerCase() === clean.toLowerCase()));
    if (clash) return setError(t("category_exists"));
    const ok = await saveCategory({ id: category?.id ?? crypto.randomUUID(), name: clean, type, color, isDefault: Boolean(locked) });
    if (ok) toast.success(t("category_saved"));
    onClose();
  };

  return (
    <Modal title={t(category ? "edit_category" : "add_category")} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label htmlFor="cat-name" className="label">{t("category_name")}</label>
          <input id="cat-name" className="field disabled:opacity-60" maxLength={40} disabled={locked} autoFocus={!locked} value={locked && category ? categoryLabel(category) : name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(error)} />
          {error && <p role="alert" className="field-error">{error}</p>}
        </div>
        <fieldset>
          <legend className="label">{t("color")}</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((c) => (
              <label key={c} className={`size-8 cursor-pointer rounded-full border-2 has-focus-visible:outline-2 has-focus-visible:outline-primary ${color === c ? "border-ink" : "border-transparent"}`} style={{ backgroundColor: c }}>
                <input type="radio" name="color" className="sr-only" aria-label={c} checked={color === c} onChange={() => setColor(c)} />
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>{t("cancel")}</button>
          <button type="submit" className="btn-primary">{t("save")}</button>
        </div>
      </form>
    </Modal>
  );
}

function Categories() {
  const { t, categoryLabel } = usePrefs();
  const { categories, transactions, deleteCategory } = useFinance();
  const [form, setForm] = useState<{ category?: Category; type: TxType } | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const protectedIds = [OTHER_EXPENSE_ID, OTHER_INCOME_ID];

  const fallbackName = (c: Category) => {
    const other = DEFAULT_CATEGORIES.find((d) => d.id === (c.type === "income" ? OTHER_INCOME_ID : OTHER_EXPENSE_ID));
    return other ? categoryLabel(other) : "";
  };

  return (
    <Section title={t("categories_section")}>
      <div className="grid gap-6 md:grid-cols-2">
        {(["expense", "income"] as const).map((type) => (
          <div key={type}>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted">{t(type)}</h3>
              <button type="button" className="btn-secondary !min-h-8 !px-2.5 text-xs" onClick={() => setForm({ type })}><Plus size={14} />{t("add_category")}</button>
            </div>
            <ul className="divide-y divide-line">
              {categories.filter((c) => c.type === type).sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b))).map((c) => (
                <li key={c.id} className="flex items-center gap-2 py-1 text-sm">
                  <CategoryDot color={c.color} />
                  <span className="min-w-0 flex-1 truncate">{categoryLabel(c)}</span>
                  {c.isDefault && <span className="text-xs text-muted">{t("built_in")}</span>}
                  <button type="button" className="btn-icon !size-8" aria-label={`${t("edit")}: ${categoryLabel(c)}`} onClick={() => setForm({ category: c, type })}><Pencil size={14} /></button>
                  <button type="button" className="btn-icon !size-8" aria-label={`${t("delete")}: ${categoryLabel(c)}`} disabled={protectedIds.includes(c.id)} onClick={() => setDeleting(c)}><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {form && <CategoryForm category={form.category} type={form.type} onClose={() => setForm(null)} />}
      {deleting && (
        <ConfirmDialog
          title={t("delete_category_title")}
          body={t("delete_category_body", { n: transactions.filter((x) => x.categoryId === deleting.id).length, other: fallbackName(deleting) })}
          confirmLabel={t("delete")}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            const c = deleting;
            setDeleting(null);
            if (await deleteCategory(c)) toast.success(t("category_deleted"));
          }}
        />
      )}
    </Section>
  );
}

export default function Settings() {
  const { t, lang, currency, theme, setPrefs, categoryLabel } = usePrefs();
  const { user, logout, cloudEnabled } = useAuth();
  const { transactions, category, isGuest, hasSample, loadSample, removeSample, clearEntries, guestEntryCount, moveGuestEntries } = useFinance();
  const [importing, setImporting] = useState(false);
  const [clearing, setClearing] = useState(false);

  const exportAll = () => {
    if (transactions.length === 0) {
      toast.info(t("nothing_to_export"));
      return;
    }
    const name = (id: string) => {
      const c = category(id);
      return c ? categoryLabel(c) : "";
    };
    downloadFile(`transactions-${todayISO()}.csv`, toCsv(transactions, name));
  };

  return (
    <>
      <PageHeader title={t("settings_title")} />
      <div className="space-y-4">
        <Section title={t("pref_section")}>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="pref-currency" className="label">{t("currency")}</label>
              <select id="pref-currency" className="field" value={currency} onChange={(e) => setPrefs({ currency: e.target.value as Currency })}>
                <option value="PKR">PKR (Rs)</option>
                <option value="USD">USD ($)</option>
              </select>
              <p className="mt-1 text-xs text-muted">{t("currency_note")}</p>
            </div>
            <div>
              <label htmlFor="pref-lang" className="label">{t("language")}</label>
              <select id="pref-lang" className="field" value={lang} onChange={(e) => setPrefs({ lang: e.target.value as Lang })}>
                <option value="en">English</option>
                <option value="ur">اردو</option>
              </select>
            </div>
            <div>
              <label htmlFor="pref-theme" className="label">{t("theme")}</label>
              <select id="pref-theme" className="field" value={theme} onChange={(e) => setPrefs({ theme: e.target.value as ThemeSetting })}>
                <option value="system">{t("theme_system")}</option>
                <option value="light">{t("theme_light")}</option>
                <option value="dark">{t("theme_dark")}</option>
              </select>
            </div>
          </div>
        </Section>

        <Categories />

        <Section title={t("data_section")}>
          <p className="mb-3 text-sm text-muted">{t(isGuest ? "data_guest_note" : "data_account_note")}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={() => setImporting(true)}>{t("import_csv")}</button>
            <button type="button" className="btn-secondary" onClick={exportAll}>{t("export_csv")}</button>
            {isGuest && !hasSample && <button type="button" className="btn-secondary" onClick={loadSample}><FlaskConical size={16} />{t("load_sample")}</button>}
            {hasSample && <button type="button" className="btn-secondary" onClick={removeSample}>{t("remove_sample")}</button>}
            <button type="button" className="btn-secondary text-expense" disabled={transactions.length === 0} onClick={() => setClearing(true)}><Trash2 size={16} />{t("clear_entries")}</button>
          </div>
        </Section>

        <Section title={t("account_section")}>
          {user ? (
            <div className="space-y-3">
              <p className="text-sm">{t("signed_in_as", { email: user.email ?? "" })}</p>
              {guestEntryCount > 0 && (
                <div className="rounded-lg bg-primary-soft p-3 text-sm">
                  <p className="font-medium">{t("move_guest_title")}</p>
                  <p className="mb-2 text-muted">{t("move_guest_body", { n: guestEntryCount })}</p>
                  <button type="button" className="btn-primary" onClick={async () => {
                    const n = await moveGuestEntries();
                    if (n > 0) toast.success(t("moved_guest", { n }));
                  }}>{t("move_guest")}</button>
                </div>
              )}
              <button type="button" className="btn-secondary" onClick={() => void logout()}><LogOut size={16} />{t("sign_out")}</button>
            </div>
          ) : cloudEnabled ? (
            <div>
              <p className="mb-3 text-sm text-muted">{t("guest_account_note")}</p>
              <div className="flex flex-wrap gap-2">
                <Link to="/register" className="btn-primary">{t("create_account")}</Link>
                <Link to="/login" className="btn-secondary">{t("sign_in")}</Link>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">{t("cloud_off_note")}</p>
          )}
        </Section>
      </div>

      {importing && <ImportModal onClose={() => setImporting(false)} />}
      {clearing && (
        <ConfirmDialog
          title={t("clear_title")}
          body={t("clear_body")}
          confirmLabel={t("delete")}
          onCancel={() => setClearing(false)}
          onConfirm={() => {
            setClearing(false);
            void clearEntries();
          }}
        />
      )}
    </>
  );
}
