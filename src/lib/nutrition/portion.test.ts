import { describe, expect, it } from "vitest";
import { amountLabel, defaultAmount, nutritionFor, type FoodCandidate } from "./portion";

const milk: FoodCandidate = {
  name: "Leche descremada",
  per100g: { calories: 43, protein: 3.2, carbs: 4.6, fat: 1.3 },
  servingGrams: 200,
  source: "search",
};
const sandwich: FoodCandidate = {
  name: "Sándwich",
  serving: { calories: 350, protein: 15, carbs: 40, fat: 12 },
  source: "manual",
};

describe("nutritionFor", () => {
  it("scales per-100 g data by grams", () => {
    expect(nutritionFor(milk, 250)).toEqual({ calories: 108, protein: 8, carbs: 11.5, fat: 3.3 });
  });
  it("multiplies fixed servings", () => {
    expect(nutritionFor(sandwich, 1.5)).toEqual({ calories: 525, protein: 22.5, carbs: 60, fat: 18 });
  });
  it("returns zeros for invalid amounts", () => {
    expect(nutritionFor(milk, 0).calories).toBe(0);
    expect(nutritionFor(milk, Number.NaN).calories).toBe(0);
  });
});

describe("defaultAmount", () => {
  it("prefers last grams, then serving, then 100 g", () => {
    expect(defaultAmount({ ...milk, lastGrams: 180 })).toBe(180);
    expect(defaultAmount(milk)).toBe(200);
    expect(defaultAmount({ ...milk, servingGrams: undefined })).toBe(100);
    expect(defaultAmount(sandwich)).toBe(1);
  });
});

describe("amountLabel", () => {
  it("formats grams and servings in Spanish", () => {
    expect(amountLabel(milk, 150.5)).toBe("150,5 g");
    expect(amountLabel(sandwich, 1)).toBe("1 porción");
    expect(amountLabel(sandwich, 2)).toBe("2 porciones");
  });
});

describe("amountLabel for liquids", () => {
  it("uses ml when the product is a liquid", () => {
    expect(amountLabel({ ...milk, isLiquid: true }, 200)).toBe("200 ml");
  });
});
