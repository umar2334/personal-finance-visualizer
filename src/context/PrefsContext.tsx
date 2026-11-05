import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { en, ur, type TranslationKey } from "@/i18n/translations";
import { formatMoney } from "@/lib/money";
import type { Category, Currency, Lang, ThemeSetting } from "@/types";

const KEY = "pfv:prefs:v1";

interface Prefs {
  currency: Currency;
  lang: Lang;
  theme: ThemeSetting;
}

interface PrefsValue extends Prefs {
  setPrefs: (change: Partial<Prefs>) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  money: (value: number, compact?: boolean) => string;
  categoryLabel: (category: Category) => string;
  resolvedTheme: "light" | "dark";
}

const defaults: Prefs = { currency: "PKR", lang: "en", theme: "system" };

function readPrefs(): Prefs {
  try {
    return { ...defaults, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Prefs>) };
  } catch {
    return defaults;
  }
}

const systemTheme = () => (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

const PrefsContext = createContext<PrefsValue | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setState] = useState(readPrefs);
  const [system, setSystem] = useState<"light" | "dark">(systemTheme);

  useEffect(() => {
    const query = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystem(systemTheme());
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme = prefs.theme === "system" ? system : prefs.theme;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.lang = prefs.lang;
    root.dir = prefs.lang === "ur" ? "rtl" : "ltr";
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      // Preferences are a convenience: if storage is blocked they last for this visit.
    }
  }, [prefs, resolvedTheme]);

  const setPrefs = useCallback((change: Partial<Prefs>) => setState((p) => ({ ...p, ...change })), []);

  const t = useCallback<PrefsValue["t"]>((key, vars) => {
    const text = (prefs.lang === "ur" ? ur : en)[key];
    if (!vars) return text;
    return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), text);
  }, [prefs.lang]);

  const value = useMemo<PrefsValue>(() => ({
    ...prefs,
    setPrefs,
    t,
    resolvedTheme,
    money: (n, compact) => formatMoney(n, prefs.currency, { compact }),
    categoryLabel: (c) => (c.isDefault ? t(`cat_${c.id}` as TranslationKey) ?? c.name : c.name),
  }), [prefs, setPrefs, t, resolvedTheme]);

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used inside PrefsProvider");
  return ctx;
}
