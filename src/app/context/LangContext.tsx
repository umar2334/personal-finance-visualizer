import { createContext, useContext, useState, ReactNode } from "react";

type Lang = "en" | "ur";

interface LangContextType {
  lang: Lang;
  toggleLang: () => void;
  t: (key: string) => string;
}

const translations: Record<string, Record<Lang, string>> = {
  // Nav / General
  "dashboard":           { en: "Dashboard",                ur: "ڈیش بورڈ" },
  "transactions":        { en: "Transactions",             ur: "لین دین" },
  "logout":              { en: "Logout",                   ur: "لاگ آؤٹ" },
  "add_entry":           { en: "New Entry",                ur: "نئی اندراج" },
  "save":                { en: "Save",                     ur: "محفوظ کریں" },
  "cancel":              { en: "Cancel",                   ur: "منسوخ" },
  "delete":              { en: "Delete",                   ur: "حذف کریں" },
  "edit":                { en: "Edit",                     ur: "ترمیم" },
  "search":              { en: "Search entries...",        ur: "اندراج تلاش کریں..." },
  "all_categories":      { en: "All Categories",           ur: "تمام زمرے" },
  "all":                 { en: "All",                      ur: "سب" },
  "income":              { en: "Income",                   ur: "آمدنی" },
  "expense":             { en: "Expense",                  ur: "خرچہ" },

  // Dashboard
  "greeting_morning":    { en: "Good Morning",             ur: "صبح بخیر" },
  "greeting_afternoon":  { en: "Good Afternoon",           ur: "السلام علیکم" },
  "greeting_evening":    { en: "Good Evening",             ur: "شام بخیر" },
  "month_income":        { en: "Month Income",             ur: "ماہانہ آمدنی" },
  "month_expense":       { en: "Month Expense",            ur: "ماہانہ خرچہ" },
  "total_savings":       { en: "Total Savings",            ur: "کل بچت" },
  "current_savings":     { en: "This Month Net",           ur: "اس ماہ بچت" },
  "income_sub":          { en: "Salary + freelance",       ur: "تنخواہ + فری لانس" },
  "expense_sub":         { en: "All expenses",             ur: "تمام خرچے" },
  "savings_sub":         { en: "Overall balance",          ur: "مجموعی بیلنس" },
  "net_sub":             { en: "Net balance",              ur: "خالص بیلنس" },
  "monthly_chart":       { en: "Monthly Income vs Expense",ur: "ماہانہ آمدنی بمقابلہ خرچہ" },
  "last_3_months":       { en: "Last 3 months",            ur: "پچھلے 3 مہینے" },
  "category_breakdown":  { en: "Expense Breakdown",        ur: "خرچے کی تفصیل" },
  "recent_entries":      { en: "Recent Entries",           ur: "حالیہ اندراجات" },
  "view_all":            { en: "View All →",               ur: "سب دیکھیں →" },
  "no_transactions":     { en: "No transactions yet",      ur: "ابھی کوئی لین دین نہیں" },
  "add_first":           { en: "Add your first entry",     ur: "پہلی اندراج شامل کریں" },

  // Transactions page
  "total_entries":       { en: "Total Entries",            ur: "کل اندراجات" },
  "total_income":        { en: "Total Income",             ur: "کل آمدنی" },
  "total_expense":       { en: "Total Expense",            ur: "کل خرچہ" },
  "no_entries_found":    { en: "No entries found",         ur: "کوئی اندراج نہیں ملا" },
  "add_first_entry":     { en: "+ Add first entry",        ur: "+ پہلی اندراج شامل کریں" },

  // Modal
  "add_entry_title":     { en: "Add New Entry",            ur: "نئی اندراج شامل کریں" },
  "edit_entry_title":    { en: "Edit Entry",               ur: "اندراج ترمیم کریں" },
  "what_expense":        { en: "Description",              ur: "تفصیل" },
  "expense_placeholder": { en: "e.g. Groceries, Petrol, Rent...", ur: "مثلاً سبزی، پیٹرول، کرایہ..." },
  "income_placeholder":  { en: "e.g. Salary, Freelance...",ur: "مثلاً تنخواہ، فری لانس..." },
  "amount":              { en: "Amount (Rs.)",             ur: "رقم (روپے)" },
  "category":            { en: "Category",                 ur: "زمرہ" },
  "save_entry":          { en: "✓ Save Entry",             ur: "✓ اندراج محفوظ کریں" },
  "save_changes":        { en: "✓ Save Changes",           ur: "✓ تبدیلیاں محفوظ کریں" },

  // Delete confirm
  "delete_confirm":      { en: "Delete Entry?",            ur: "اندراج حذف کریں؟" },
  "delete_msg":          { en: "will be deleted permanently.", ur: "ہمیشہ کے لیے حذف ہو جائے گا۔" },
  "delete_yes":          { en: "Yes, Delete",              ur: "ہاں، حذف کریں" },
  "go_back":             { en: "Go Back",                  ur: "واپس جائیں" },

  // Chart labels
  "chart_income":        { en: "Income",                   ur: "آمدنی" },
  "chart_expense":       { en: "Expense",                  ur: "خرچہ" },
};

const LangContext = createContext<LangContextType | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  const toggleLang = () => setLang((l) => (l === "en" ? "ur" : "en"));

  const t = (key: string): string => {
    return translations[key]?.[lang] ?? key;
  };

  // No RTL — layout stays intact, only text changes
  return (
    <LangContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}
