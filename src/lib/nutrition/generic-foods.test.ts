import { describe, expect, it } from "vitest";
import { GENERIC_FOODS, genericCandidate, searchGeneric } from "./generic-foods";
import { nutritionFor } from "./portion";

describe("generic foods dataset", () => {
  it("has unique USDA ids and sane values", () => {
    expect(GENERIC_FOODS.length).toBeGreaterThan(100);
    expect(new Set(GENERIC_FOODS.map((g) => g.id)).size).toBe(GENERIC_FOODS.length);
    for (const g of GENERIC_FOODS) {
      expect(g.name.length).toBeGreaterThan(1);
      expect(g.en.length).toBeGreaterThan(1);
      const { calories, protein, carbs, fat } = g.per100g;
      for (const v of [calories, protein, carbs, fat]) expect(v).toBeGreaterThanOrEqual(0);
      expect(protein + carbs + fat).toBeLessThanOrEqual(100.5);
      if (g.serving) expect(g.serving.grams).toBeGreaterThan(0);
    }
  });

  it("keeps the official USDA values (spot check)", () => {
    const rice = GENERIC_FOODS.find((g) => g.id === 168878)!; // Rice, white, long-grain, cooked
    expect(rice.per100g).toEqual({ calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3 });
    const breast = GENERIC_FOODS.find((g) => g.id === 171477)!; // Chicken breast, roasted
    expect(breast.per100g.calories).toBe(165);
    expect(breast.per100g.protein).toBe(31);
  });
});

describe("searchGeneric", () => {
  it("ignores accents and case", () => {
    expect(searchGeneric("platano").map((g) => g.name)).toContain("Plátano");
    expect(searchGeneric("QUINOA").map((g) => g.name)).toContain("Quínoa cocida");
  });

  it("matches every word as a prefix", () => {
    const names = searchGeneric("pollo asad").map((g) => g.name);
    expect(names).toContain("Pechuga de pollo asada (sin piel)");
    expect(names).toContain("Trutro de pollo asado (sin piel)");
    expect(searchGeneric("pollo frito")).toEqual([]);
  });

  it("ranks names that start with the query first", () => {
    expect(searchGeneric("arroz")[0].name.startsWith("Arroz")).toBe(true);
    expect(searchGeneric("leche")[0].name.startsWith("Leche")).toBe(true);
  });

  it("returns nothing for an empty query", () => {
    expect(searchGeneric("  ")).toEqual([]);
  });
});

describe("genericCandidate", () => {
  it("logs by grams with the household serving", () => {
    const rice = genericCandidate(GENERIC_FOODS.find((g) => g.id === 168878)!);
    expect(rice.source).toBe("generic");
    expect(rice.servingName).toBe("1 taza");
    expect(rice.servingGrams).toBe(158);
    expect(nutritionFor(rice, 158).calories).toBe(205); // 130 × 1.58
  });
});
