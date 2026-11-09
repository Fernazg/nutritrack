import { describe, expect, it } from "vitest";
import { suggestFromSaved } from "./suggest";
import type { FoodItem } from "@/types/nutrition";

const item = (name: string, kcal: number, protein: number, useCount = 1): FoodItem => ({
  key: name,
  name,
  serving: { calories: kcal, protein, carbs: 0, fat: 0 },
  favorite: 0,
  useCount,
  lastUsed: 0,
  source: "manual",
});

const foods = [
  item("Yogur proteico", 120, 15, 2),
  item("Pizza", 800, 30, 9),
  item("Pechuga", 200, 40, 1),
  item("Galletas", 150, 2, 7),
];

describe("suggestFromSaved", () => {
  it("prioritizes protein density when protein is missing", () => {
    const s = suggestFromSaved(foods, { calories: 500, protein: 60, carbs: 0, fat: 0 });
    expect(s.map((x) => x.food.name)).toEqual(["Pechuga", "Yogur proteico", "Galletas"]);
    expect(s[0].reason).toBe("protein");
  });
  it("excludes foods that exceed the remaining calories", () => {
    const s = suggestFromSaved(foods, { calories: 500, protein: 60, carbs: 0, fat: 0 });
    expect(s.find((x) => x.food.name === "Pizza")).toBeUndefined();
  });
  it("ranks by usage when protein is covered", () => {
    const s = suggestFromSaved(foods, { calories: 1000, protein: 5, carbs: 0, fat: 0 });
    expect(s[0].food.name).toBe("Pizza");
    expect(s[0].reason).toBe("fits");
  });
  it("returns nothing when almost no calories remain", () => {
    expect(suggestFromSaved(foods, { calories: 30, protein: 40, carbs: 0, fat: 0 })).toEqual([]);
  });
});
