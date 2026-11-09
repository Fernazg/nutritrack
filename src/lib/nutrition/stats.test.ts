import { describe, expect, it } from "vitest";
import { averageLogged, dailyTotals, daysOnTarget, macroEnergySplit, summarizeDays, trendRatePerWeek, weightChange, weightTrend } from "./stats";
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


describe("weightTrend", () => {
  it("starts at the first weight and smooths daily noise", () => {
    const pts = weightTrend([
      { date: "2026-11-01", weightKg: 80 },
      { date: "2026-11-02", weightKg: 81 },
      { date: "2026-11-03", weightKg: 79 },
    ]);
    expect(pts[0].trend).toBe(80);
    expect(pts[1].trend).toBe(80.1); // 80 + 0.1 × 1
    expect(pts[2].trend).toBe(79.99); // 80.1 + 0.1 × (79 − 80.1)
  });

  it("gives more weight to a value after a long gap", () => {
    const pts = weightTrend([
      { date: "2026-11-01", weightKg: 80 },
      { date: "2026-11-11", weightKg: 78 },
    ]);
    // 1 − 0.9^10 = 0.6513 → 80 − 2 × 0.6513
    expect(pts[1].trend).toBeCloseTo(78.7, 1);
  });

  it("sorts unordered input", () => {
    const pts = weightTrend([
      { date: "2026-11-03", weightKg: 79 },
      { date: "2026-11-01", weightKg: 80 },
    ]);
    expect(pts.map((p) => p.date)).toEqual(["2026-11-01", "2026-11-03"]);
  });
});

describe("trendRatePerWeek", () => {
  it("needs at least a week of history", () => {
    const pts = weightTrend([
      { date: "2026-11-01", weightKg: 80 },
      { date: "2026-11-04", weightKg: 79.5 },
    ]);
    expect(trendRatePerWeek(pts)).toBeNull();
  });

  it("reports a steady loss as a negative weekly rate", () => {
    const entries = Array.from({ length: 29 }, (_, i) => ({
      date: `2026-10-${String(i + 1).padStart(2, "0")}`,
      weightKg: 80 - i * (0.5 / 7),
    }));
    const rate = trendRatePerWeek(weightTrend(entries))!;
    expect(rate).toBeLessThan(-0.3);
    expect(rate).toBeGreaterThan(-0.6);
  });
});

describe("summarizeDays", () => {
  it("averages logged days only and counts days near the goal", () => {
    const days = [
      { date: "a", logged: true, calories: 2000, protein: 0, carbs: 0, fat: 0 },
      { date: "b", logged: true, calories: 1500, protein: 0, carbs: 0, fat: 0 },
      { date: "c", logged: false, calories: 0, protein: 0, carbs: 0, fat: 0 },
    ];
    expect(summarizeDays(days, 2000)).toEqual({ daysLogged: 2, avgCalories: 1750, onTarget: 1 });
  });
});
