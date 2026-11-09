import type { FoodEntry, NutritionTotals } from "@/types/nutrition";

export const EMPTY_TOTALS: NutritionTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

export function sumTotals(entries: readonly FoodEntry[] | undefined): NutritionTotals {
  if (!entries) return EMPTY_TOTALS;
  return entries.reduce<NutritionTotals>(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    EMPTY_TOTALS,
  );
}
