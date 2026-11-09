import type { FoodEntry, NutritionTotals } from "@/types/nutrition";

export interface DayTotals extends NutritionTotals {
  date: string;
  logged: boolean;
}

/** One row per date in `dates`, summing entries; days without entries have logged=false. */
export function dailyTotals(entries: readonly FoodEntry[], dates: readonly string[]): DayTotals[] {
  const map = new Map<string, DayTotals>(
    dates.map((d) => [d, { date: d, logged: false, calories: 0, protein: 0, carbs: 0, fat: 0 }]),
  );
  for (const e of entries) {
    const day = map.get(e.date);
    if (!day) continue;
    day.logged = true;
    day.calories += e.calories;
    day.protein += e.protein;
    day.carbs += e.carbs;
    day.fat += e.fat;
  }
  return dates.map((d) => map.get(d)!);
}

export interface PeriodSummary extends NutritionTotals {
  daysLogged: number;
}

/** Averages over logged days only, so skipped days don't distort the numbers. */
export function averageLogged(days: readonly DayTotals[]): PeriodSummary {
  const logged = days.filter((d) => d.logged);
  const n = logged.length;
  if (n === 0) return { daysLogged: 0, calories: 0, protein: 0, carbs: 0, fat: 0 };
  const sum = (k: keyof NutritionTotals) => logged.reduce((s, d) => s + d[k], 0) / n;
  return {
    daysLogged: n,
    calories: Math.round(sum("calories")),
    protein: Math.round(sum("protein")),
    carbs: Math.round(sum("carbs")),
    fat: Math.round(sum("fat")),
  };
}

/** Share of energy from each macro (Atwater 4/4/9), in whole percents. */
export function macroEnergySplit(t: NutritionTotals): { protein: number; carbs: number; fat: number } {
  const p = t.protein * 4;
  const c = t.carbs * 4;
  const f = t.fat * 9;
  const total = p + c + f;
  if (total === 0) return { protein: 0, carbs: 0, fat: 0 };
  return {
    protein: Math.round((p / total) * 100),
    carbs: Math.round((c / total) * 100),
    fat: Math.round((f / total) * 100),
  };
}

/** Days within ±10 % of the calorie goal (counted only among logged days). */
export function daysOnTarget(days: readonly DayTotals[], goal: number, tolerance = 0.1): number {
  return days.filter((d) => d.logged && Math.abs(d.calories - goal) <= goal * tolerance).length;
}

/**
 * Weight change over the last `days` days: latest weight minus the most
 * recent weight on or before (latest date − days). null if not enough data.
 */
export function weightChange(
  entries: readonly { date: string; weightKg: number }[],
  days: number,
): number | null {
  if (entries.length < 2) return null;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1];
  const [y, m, d] = last.date.split("-").map(Number);
  const cutoff = new Date(y, m - 1, d - days);
  const cutoffIso = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
  const base = [...sorted].reverse().find((e) => e.date <= cutoffIso);
  if (!base) return null;
  return Math.round((last.weightKg - base.weightKg) * 10) / 10;
}
