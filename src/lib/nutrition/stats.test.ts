import { describe, expect, it } from "vitest";
import { averageLogged, dailyTotals, daysOnTarget, macroEnergySplit, weightChange } from "./stats";
import type { FoodEntry } from "@/types/nutrition";

const e = (date: string, calories: number, protein = 0, carbs = 0, fat = 0): FoodEntry => ({
  date, calories, protein, carbs, fat, meal: "almuerzo", name: "x", source: "manual", createdAt: 0,
});

const dates = ["2026-11-01", "2026-11-02", "2026-11-03"];

describe("dailyTotals", () => {
  it("sums per day and marks days without entries", () => {
    const days = dailyTotals([e("2026-11-01", 500, 30), e("2026-11-01", 300, 10), e("2026-11-03", 1000)], dates);
    expect(days.map((d) => [d.calories, d.logged])).toEqual([[800, true], [0, false], [1000, true]]);
    expect(days[0].protein).toBe(40);
  });
  it("ignores entries outside the range", () => {
    expect(dailyTotals([e("2026-10-31", 999)], dates).every((d) => !d.logged)).toBe(true);
  });
});

describe("averageLogged", () => {
  it("averages only logged days", () => {
    const avg = averageLogged(dailyTotals([e("2026-11-01", 1800), e("2026-11-03", 2200)], dates));
    expect(avg.calories).toBe(2000);
    expect(avg.daysLogged).toBe(2);
  });
  it("is zero with no data", () => {
    expect(averageLogged(dailyTotals([], dates)).daysLogged).toBe(0);
  });
});

describe("macroEnergySplit", () => {
  it("uses 4/4/9 kcal per gram", () => {
    // 100 g P = 400, 200 g C = 800, 44.4 g F ≈ 400 → 25/50/25
    expect(macroEnergySplit({ calories: 1600, protein: 100, carbs: 200, fat: 44.44 })).toEqual({
      protein: 25, carbs: 50, fat: 25,
    });
  });
});

describe("daysOnTarget", () => {
  it("counts logged days within ±10 % of the goal", () => {
    const days = dailyTotals([e("2026-11-01", 1850), e("2026-11-02", 2500), e("2026-11-03", 2150)], dates);
    expect(daysOnTarget(days, 2000)).toBe(2);
  });
});

describe("weightChange", () => {
  const w = [
    { date: "2026-10-01", weightKg: 84 },
    { date: "2026-10-26", weightKg: 82.4 },
    { date: "2026-11-02", weightKg: 81.5 },
    { date: "2026-11-09", weightKg: 80.9 },
  ];
  it("compares with the latest weigh-in at least N days earlier", () => {
    expect(weightChange(w, 7)).toBe(-0.6); // vs 2026-11-02
    expect(weightChange(w, 30)).toBe(-3.1); // vs 2026-10-01
  });
  it("returns null without an old enough reference", () => {
    expect(weightChange(w, 60)).toBeNull();
    expect(weightChange([w[0]], 7)).toBeNull();
  });
});
