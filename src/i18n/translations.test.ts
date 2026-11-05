import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORIES } from "@/data/defaults";
import { en, ur, type TranslationKey } from "./translations";

const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();

describe("translations", () => {
  it("has an Urdu string for every English key, with none left blank", () => {
    expect(Object.keys(ur).sort()).toEqual(Object.keys(en).sort());
    expect(Object.values(ur).every((s) => s.trim().length > 0)).toBe(true);
  });
  it("keeps the same placeholders in both languages", () => {
    for (const key of Object.keys(en) as TranslationKey[]) {
      expect(placeholders(ur[key]), key).toEqual(placeholders(en[key]));
    }
  });
  it("translates every built-in category", () => {
    for (const c of DEFAULT_CATEGORIES) expect(en).toHaveProperty(`cat_${c.id}`);
  });
});
