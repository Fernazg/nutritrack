import { describe, expect, it } from "vitest";
import { bmrMifflin, computePlan, referenceWeight, tdee } from "./energy";
import type { Profile } from "@/types/nutrition";

const now = new Date(2026, 10, 9);
const base: Profile = {
  sex: "male",
  birthYear: 1996, // 30 years old in 2026
  heightCm: 175,
  activity: "moderate",
  goal: "lose",
  rateKgPerWeek: 0.5,
  proteinPerKg: 1.6,
};

describe("bmrMifflin", () => {
  it("matches the published equation for men", () => {
    // 10*80 + 6.25*175 - 5*30 + 5 = 1748.75
    expect(bmrMifflin({ sex: "male", weightKg: 80, heightCm: 175, age: 30 })).toBeCloseTo(1748.75);
  });
  it("matches the published equation for women", () => {
    // 10*60 + 6.25*165 - 5*30 - 161 = 1320.25
    expect(bmrMifflin({ sex: "female", weightKg: 60, heightCm: 165, age: 30 })).toBeCloseTo(1320.25);
  });
});

describe("tdee", () => {
  it("applies the activity factor", () => {
    expect(tdee(1000, "moderate")).toBeCloseTo(1550);
    expect(tdee(1000, "sedentary")).toBeCloseTo(1200);
  });
});

describe("computePlan", () => {
  it("builds a moderate deficit with macros that add up", () => {
    const plan = computePlan(base, 80, now);
    expect(plan.bmr).toBe(1749);
    expect(plan.tdee).toBe(2711); // 1748.75 * 1.55
    expect(plan.adjustment).toBe(-550); // 0.5 kg * 7700 / 7
    expect(plan.goals.calories).toBe(2160);
    expect(plan.goals.protein).toBe(128); // 1.6 * 80
    const kcalFromMacros = plan.goals.protein * 4 + plan.goals.carbs * 4 + plan.goals.fat * 9;
    expect(Math.abs(kcalFromMacros - plan.goals.calories)).toBeLessThan(10);
    expect(plan.warnings).toEqual([]);
    expect(plan.expectedKgPerWeek).toBeCloseTo(-0.5, 1);
  });

  it("caps aggressive deficits at 25% of TDEE", () => {
    const plan = computePlan({ ...base, rateKgPerWeek: 1.5 }, 80, now);
    expect(plan.warnings).toContain("deficit_capped");
    expect(-plan.adjustment).toBeLessThanOrEqual(Math.ceil(plan.tdee * 0.25));
  });

  it("never goes below the minimum calories", () => {
    const plan = computePlan(
      { ...base, sex: "female", heightCm: 150, birthYear: 1950, activity: "sedentary", rateKgPerWeek: 1 },
      48,
      now,
    );
    expect(plan.goals.calories).toBeGreaterThanOrEqual(1200);
    expect(plan.warnings).toContain("floor_applied");
  });

  it("maintenance has no adjustment", () => {
    const plan = computePlan({ ...base, goal: "maintain" }, 80, now);
    expect(plan.adjustment).toBe(0);
    expect(plan.goals.calories).toBe(Math.round(plan.tdee / 10) * 10);
  });

  it("suggests water around 35 ml/kg rounded to 250 ml", () => {
    expect(computePlan(base, 80, now).goals.waterMl).toBe(2750);
  });
});

describe("referenceWeight", () => {
  it("uses actual weight below BMI 30", () => {
    expect(referenceWeight(80, 175)).toBe(80);
  });
  it("uses weight at BMI 25 for BMI ≥ 30", () => {
    expect(referenceWeight(110, 175)).toBeCloseTo(76.6, 1);
  });
});
