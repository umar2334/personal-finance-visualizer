import Papa from "papaparse";
import type { Category, Transaction, TxType } from "@/types";
import { isValidISODate } from "./dates";
import { MAX_AMOUNT, roundMoney } from "./money";

export const MAX_IMPORT_ROWS = 5000;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export interface ParsedRow {
  /** Row number as seen in a spreadsheet: the header is row 1. */
  line: number;
  date: string;
  type: TxType;
  amount: number;
  /** Name as written in the file; empty means "Other". */
  categoryName: string;
  description: string;
}

export type CsvErrorCode =
  | "missing_columns"
  | "too_many_rows"
  | "empty_file"
  | "bad_date"
  | "bad_amount"
  | "bad_type"
  | "missing_type"
  | "malformed";

export interface RowError {
  line: number;
  code: CsvErrorCode;
  value?: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  errors: RowError[];
  /** Set when the file as a whole can't be used. */
  fatal?: CsvErrorCode;
}

const HEADER_ALIASES: Record<string, string[]> = {
  date: ["date", "transaction date", "posting date"],
  type: ["type", "transaction type"],
  amount: ["amount", "value", "total"],
  category: ["category", "categories"],
  description: ["description", "details", "note", "notes", "narration", "memo"],
};

/** Accepts YYYY-MM-DD and day-first D/M/YYYY or D-M-YYYY, the format Pakistani banks use. */
export function parseDate(raw: string): string | null {
  const value = raw.trim();
  if (isValidISODate(value)) return value;
  const m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(value);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  return isValidISODate(iso) ? iso : null;
}

/** Handles "1,250.50", "Rs 500", "$20", "-300" and accounting-style "(300)". */
export function parseAmount(raw: string): number | null {
  let value = raw.trim();
  const negative = /^\(.*\)$/.test(value) || value.includes("-");
  value = value.replace(/rs\.?|pkr|usd|\$|,|\s|[()-]/gi, "");
  if (!/^\d+(\.\d+)?$/.test(value)) return null;
  const amount = Number(value);
  return negative ? -amount : amount;
}

function parseType(raw: string): TxType | null {
  const value = raw.trim().toLowerCase();
  if (["income", "credit", "cr"].includes(value)) return "income";
  if (["expense", "debit", "dr"].includes(value)) return "expense";
  return null;
}

/** Undoes the apostrophe `toCsv` adds, so exported files re-import unchanged. */
const unescapeCell = (value: string) => (/^'[=+\-@]/.test(value) ? value.slice(1) : value);

export function parseTransactionsCsv(text: string): ParseResult {
  const clean = text.replace(/^\uFEFF/, "");
  if (!clean.trim()) return { rows: [], errors: [], fatal: "empty_file" };

  const parsed = Papa.parse<Record<string, string>>(clean, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const headers = parsed.meta.fields ?? [];
  const column = (name: string) => HEADER_ALIASES[name]!.find((alias) => headers.includes(alias));
  const dateCol = column("date");
  const amountCol = column("amount");
  if (!dateCol || !amountCol) return { rows: [], errors: [], fatal: "missing_columns" };
  if (parsed.data.length > MAX_IMPORT_ROWS) return { rows: [], errors: [], fatal: "too_many_rows" };
  const typeCol = column("type");
  const categoryCol = column("category");
  const descriptionCol = column("description");

  const rows: ParsedRow[] = [];
  const errors: RowError[] = [];
  const malformed = new Set(
    parsed.errors.filter((e) => e.row !== undefined && e.code !== "UndetectableDelimiter").map((e) => e.row as number),
  );

  parsed.data.forEach((record, index) => {
    const line = index + 2;
    if (malformed.has(index)) {
      errors.push({ line, code: "malformed" });
      return;
    }
    const rawDate = record[dateCol] ?? "";
    const date = parseDate(rawDate);
    if (!date) {
      errors.push({ line, code: "bad_date", value: rawDate });
      return;
    }
    const rawAmount = record[amountCol] ?? "";
    const amount = parseAmount(rawAmount);
    if (amount === null || amount === 0 || Math.abs(amount) > MAX_AMOUNT) {
      errors.push({ line, code: "bad_amount", value: rawAmount });
      return;
    }
    // An explicit type wins. Otherwise the sign decides: signed bank exports only.
    const rawType = typeCol ? (record[typeCol] ?? "").trim() : "";
    let type: TxType;
    if (rawType) {
      const parsedType = parseType(rawType);
      if (!parsedType) {
        errors.push({ line, code: "bad_type", value: rawType });
        return;
      }
      type = parsedType;
    } else if (typeCol) {
      errors.push({ line, code: "missing_type" });
      return;
    } else {
      type = amount < 0 ? "expense" : "income";
    }
    rows.push({
      line,
      date,
      type,
      amount: roundMoney(Math.abs(amount)),
      categoryName: unescapeCell((categoryCol ? record[categoryCol] : "")?.trim() ?? ""),
      description: unescapeCell((descriptionCol ? record[descriptionCol] : "")?.trim() ?? "").slice(0, 140),
    });
  });

  return { rows, errors };
}

const duplicateKey = (t: { date: string; type: TxType; amount: number; description: string }) =>
  `${t.date}|${t.type}|${t.amount}|${t.description.toLowerCase()}`;

/** Lines already present, so re-importing a statement doesn't double-count it. */
export function findDuplicateLines(rows: ParsedRow[], existing: Transaction[]): Set<number> {
  const seen = new Set(existing.map(duplicateKey));
  return new Set(rows.filter((r) => seen.has(duplicateKey(r))).map((r) => r.line));
}

/** Category names in the file that don't exist yet for that entry type. */
export function findNewCategories(rows: ParsedRow[], categories: Category[], label: (c: Category) => string) {
  const known = new Set(categories.flatMap((c) => [
    `${c.type}|${c.name.toLowerCase()}`,
    `${c.type}|${label(c).toLowerCase()}`,
  ]));
  const fresh = new Map<string, { name: string; type: TxType }>();
  for (const row of rows) {
    if (!row.categoryName) continue;
    const key = `${row.type}|${row.categoryName.toLowerCase()}`;
    if (!known.has(key) && !fresh.has(key)) fresh.set(key, { name: row.categoryName, type: row.type });
  }
  return [...fresh.values()];
}

/**
 * Spreadsheets run cells starting with these characters as formulas, so a
 * description like "=HYPERLINK(...)" could execute when the export is opened.
 */
const escapeCell = (value: string) => (/^[=+\-@\t\r]/.test(value) ? `'${value}` : value);

export function toCsv(transactions: Transaction[], categoryName: (id: string) => string): string {
  return Papa.unparse({
    fields: ["date", "type", "amount", "category", "description"],
    data: transactions.map((t) => [
      t.date,
      t.type,
      t.amount.toFixed(2),
      escapeCell(categoryName(t.categoryId)),
      escapeCell(t.description),
    ]),
  });
}

export const CSV_TEMPLATE = `date,type,amount,category,description
2026-01-01,income,85000,Salary,January salary
2026-01-03,expense,1250.50,Food,Groceries
05/01/2026,expense,3000,Transport,Monthly fuel
`;

export function downloadFile(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  // The BOM lets Excel read Urdu text as UTF-8.
  const url = URL.createObjectURL(new Blob(["\uFEFF", content], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
