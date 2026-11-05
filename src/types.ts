export type TxType = "income" | "expense";
export type Currency = "PKR" | "USD";
export type Lang = "en" | "ur";
export type ThemeSetting = "light" | "dark" | "system";

export interface Category {
  id: string;
  name: string;
  type: TxType;
  color: string;
  /** Built-in categories have translated names and cannot be renamed. */
  isDefault: boolean;
}

export interface Transaction {
  id: string;
  type: TxType;
  /** Always positive; direction comes from `type`. */
  amount: number;
  categoryId: string;
  description: string;
  /** Calendar date, YYYY-MM-DD. Stored as text so timezones can't shift it. */
  date: string;
  createdAt: string;
  isSample?: boolean;
}

export interface Budget {
  /** YYYY-MM */
  month: string;
  categoryId: string;
  limit: number;
  isSample?: boolean;
}

export interface FinanceData {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
}
