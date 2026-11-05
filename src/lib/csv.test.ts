import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORIES } from "@/data/defaults";
import type { Transaction } from "@/types";
import { CSV_TEMPLATE, MAX_IMPORT_ROWS, findDuplicateLines, findNewCategories, parseAmount, parseDate, parseTransactionsCsv, toCsv } from "./csv";

const tx = (over: Partial<Transaction>): Transaction => ({
  id: "1", type: "expense", amount: 10, categoryId: "food", description: "x", date: "2026-01-01", createdAt: "", ...over,
});

describe("parseDate", () => {
  it("accepts ISO and day-first dates", () => {
    expect(parseDate("2026-03-05")).toBe("2026-03-05");
    expect(parseDate("05/03/2026")).toBe("2026-03-05");
    expect(parseDate("5-3-2026")).toBe("2026-03-05");
  });
  it("rejects impossible or unsupported dates", () => {
    for (const bad of ["31/02/2026", "13/13/2026", "yesterday", "", "2026/03/05"]) expect(parseDate(bad)).toBeNull();
  });
});

describe("parseAmount", () => {
  it("handles common formats", () => {
    expect(parseAmount("1,250.50")).toBe(1250.5);
    expect(parseAmount("Rs 500")).toBe(500);
    expect(parseAmount("Rs. 500")).toBe(500);
    expect(parseAmount("$20")).toBe(20);
    expect(parseAmount("-300")).toBe(-300);
    expect(parseAmount("(300)")).toBe(-300);
  });
  it("rejects non-numbers", () => {
    for (const bad of ["abc", "", "12.3.4", "1e5"]) expect(parseAmount(bad)).toBeNull();
  });
});

describe("parseTransactionsCsv", () => {
  it("parses the published template with no errors", () => {
    const { rows, errors } = parseTransactionsCsv(CSV_TEMPLATE);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(3);
    expect(rows[2]).toMatchObject({ date: "2026-01-05", amount: 3000, type: "expense", categoryName: "Transport" });
  });
  it("strips a BOM and tolerates header case, spacing and aliases", () => {
    const { rows } = parseTransactionsCsv("\uFEFF Date , Type ,AMOUNT,Details\n2026-01-01,income,5,Pay\n");
    expect(rows[0]).toMatchObject({ type: "income", amount: 5, description: "Pay" });
  });
  it("infers type from the sign when there is no type column", () => {
    const { rows } = parseTransactionsCsv("date,amount\n2026-01-01,-5\n2026-01-02,7\n");
    expect(rows.map((r) => [r.type, r.amount])).toEqual([["expense", 5], ["income", 7]]);
  });
  it("reports each bad row with its spreadsheet line, keeping the good ones", () => {
    const csv = "date,type,amount\n2026-01-01,expense,5\nnope,expense,5\n2026-01-03,expense,abc\n2026-01-04,transfer,5\n2026-01-05,,5\n2026-01-06,expense,0\n";
    const { rows, errors } = parseTransactionsCsv(csv);
    expect(rows).toHaveLength(1);
    expect(errors).toEqual([
      { line: 3, code: "bad_date", value: "nope" },
      { line: 4, code: "bad_amount", value: "abc" },
      { line: 5, code: "bad_type", value: "transfer" },
      { line: 6, code: "missing_type" },
      { line: 7, code: "bad_amount", value: "0" },
    ]);
  });
  it("flags rows with the wrong column count", () => {
    const { errors } = parseTransactionsCsv("date,amount\n2026-01-01,5,extra,cells\n");
    expect(errors[0]).toMatchObject({ line: 2, code: "malformed" });
  });
  it("fails clearly on unusable files", () => {
    expect(parseTransactionsCsv("").fatal).toBe("empty_file");
    expect(parseTransactionsCsv("name,age\nA,1\n").fatal).toBe("missing_columns");
    const huge = "date,amount\n" + "2026-01-01,1\n".repeat(MAX_IMPORT_ROWS + 1);
    expect(parseTransactionsCsv(huge).fatal).toBe("too_many_rows");
  });
  it("handles quoted commas and Urdu text", () => {
    const { rows } = parseTransactionsCsv('date,amount,description\n2026-01-01,-5,"Rent, flat 2"\n2026-01-02,-5,سبزی\n');
    expect(rows.map((r) => r.description)).toEqual(["Rent, flat 2", "سبزی"]);
  });
});

describe("duplicates and new categories", () => {
  it("spots rows already recorded", () => {
    const { rows } = parseTransactionsCsv("date,type,amount,description\n2026-01-01,expense,10,X\n2026-01-02,expense,10,X\n");
    expect([...findDuplicateLines(rows, [tx({})])]).toEqual([2]);
  });
  it("lists only unknown categories, once, respecting entry type", () => {
    const { rows } = parseTransactionsCsv("date,type,amount,category\n2026-01-01,expense,1,Food\n2026-01-01,expense,1,Pets\n2026-01-01,expense,1,pets\n2026-01-01,income,1,Food\n");
    expect(findNewCategories(rows, DEFAULT_CATEGORIES, (c) => c.name)).toEqual([
      { name: "Pets", type: "expense" },
      { name: "Food", type: "income" },
    ]);
  });
});

describe("toCsv", () => {
  const name = () => "Food";
  it("neutralises spreadsheet formulas", () => {
    expect(toCsv([tx({ description: '=HYPERLINK("http://x")' })], name)).toContain(`'=HYPERLINK`);
    expect(toCsv([tx({ description: "@cmd" })], name)).toContain("'@cmd");
  });
  it("round-trips through the importer, including escaped cells", () => {
    const original = [
      tx({ description: "Rent, flat 2", amount: 1250.5 }),
      tx({ description: "=SUM(A1)", type: "income", date: "2026-02-03" }),
    ];
    const { rows, errors } = parseTransactionsCsv(toCsv(original, name));
    expect(errors).toEqual([]);
    expect(rows.map((r) => [r.date, r.type, r.amount, r.description, r.categoryName])).toEqual([
      ["2026-01-01", "expense", 1250.5, "Rent, flat 2", "Food"],
      ["2026-02-03", "income", 10, "=SUM(A1)", "Food"],
    ]);
  });
});
