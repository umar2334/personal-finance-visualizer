import { Suspense } from "react";
import { NavLink, Outlet } from "react-router";
import { Cloud, HardDrive, LayoutDashboard, LogIn, Moon, PiggyBank, Plus, Receipt, RefreshCw, Settings, Sun, TriangleAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useFinance } from "@/context/FinanceContext";
import { usePrefs } from "@/context/PrefsContext";
import { EntryModalProvider, useEntryModal } from "./EntryModal";
import { EmptyState, Spinner } from "./ui";

const NAV = [
  { to: "/", key: "nav_dashboard", icon: LayoutDashboard },
  { to: "/transactions", key: "nav_transactions", icon: Receipt },
  { to: "/budgets", key: "nav_budgets", icon: PiggyBank },
  { to: "/settings", key: "nav_settings", icon: Settings },
] as const;

function Logo() {
  return <img src="/favicon.svg" alt="" className="size-8" />;
}

function TopBar() {
  const { t, lang, setPrefs, resolvedTheme, currency } = usePrefs();
  const { isGuest } = useFinance();
  const { cloudEnabled } = useAuth();
  const { openNew } = useEntryModal();
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-1 border-b border-line bg-surface px-3 sm:px-5">
      <div className="flex items-center gap-2 lg:hidden"><Logo /></div>
      <div className="ms-2 hidden items-center gap-1.5 text-xs text-muted sm:flex lg:ms-0">
        {isGuest ? <HardDrive size={14} /> : <Cloud size={14} />}
        {isGuest ? <span><b className="font-medium text-ink">{t("guest_badge")}</b> · {t("guest_hint")}</span> : t("synced_badge")}
      </div>
      <div className="ms-auto flex items-center gap-1">
        <select aria-label={t("currency")} className="field !min-h-9 !w-auto" dir="ltr" value={currency} onChange={(e) => setPrefs({ currency: e.target.value as "PKR" | "USD" })}>
          <option value="PKR">PKR</option>
          <option value="USD">USD</option>
        </select>
        <button type="button" className="btn-icon text-sm font-medium" onClick={() => setPrefs({ lang: lang === "en" ? "ur" : "en" })} lang={lang === "en" ? "ur" : "en"}>
          {lang === "en" ? "اردو" : "EN"}
        </button>
        <button type="button" className="btn-icon" aria-label={t("toggle_theme")} onClick={() => setPrefs({ theme: resolvedTheme === "dark" ? "light" : "dark" })}>
          {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        {isGuest && cloudEnabled && (
          <NavLink to="/login" className="btn-secondary hidden sm:inline-flex"><LogIn size={16} />{t("sign_in")}</NavLink>
        )}
        <button type="button" className="btn-primary ms-1 !px-3" onClick={openNew}>
          <Plus size={16} /><span className="hidden sm:inline">{t("new_entry")}</span><span className="sr-only sm:hidden">{t("new_entry")}</span>
        </button>
      </div>
    </header>
  );
}

function Content() {
  const { t } = usePrefs();
  const { status, reload, resetLocal, isGuest } = useFinance();
  const { logout } = useAuth();
  if (status === "loading") return <Spinner label={t("loading")} />;
  if (status === "error") {
    return (
      <div className="card">
        <EmptyState icon={TriangleAlert} title={t("error_load_title")} body={t(isGuest ? "error_local_body" : "error_load_body")}>
          <button type="button" className="btn-primary" onClick={reload}><RefreshCw size={16} />{t("retry")}</button>
          {isGuest
            ? <button type="button" className="btn-secondary" onClick={resetLocal}>{t("reset_local")}</button>
            : <button type="button" className="btn-secondary" onClick={() => void logout()}>{t("sign_out")}</button>}
        </EmptyState>
      </div>
    );
  }
  return <Suspense fallback={<Spinner label={t("loading")} />}><Outlet /></Suspense>;
}

export function Layout() {
  const { t } = usePrefs();
  const linkBase = "flex items-center rounded-lg text-sm font-medium transition-colors";
  return (
    <EntryModalProvider>
      <div className="flex min-h-dvh">
        <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-e border-line bg-surface lg:flex">
          <div className="flex h-14 items-center gap-2 border-b border-line px-4 font-semibold"><Logo />{t("app_name")}</div>
          <nav aria-label={t("menu")} className="flex-1 space-y-1 p-3">
            {NAV.map(({ to, key, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `${linkBase} gap-3 px-3 py-2.5 ${isActive ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2 hover:text-ink"}`}>
                <Icon size={18} />{t(key)}
              </NavLink>
            ))}
          </nav>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="mx-auto w-full max-w-6xl flex-1 p-4 pb-24 sm:p-6 lg:pb-6"><Content /></main>
        </div>
        <nav aria-label={t("menu")} className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
          {NAV.map(({ to, key, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `${linkBase} flex-col gap-1 py-2 text-xs ${isActive ? "text-primary" : "text-muted"}`}>
              <Icon size={20} />{t(key)}
            </NavLink>
          ))}
        </nav>
      </div>
    </EntryModalProvider>
  );
}
