import type { FoodItem, NutritionTotals } from "@/types/nutrition";
import { candidateFromItem, defaultAmount, nutritionFor, type FoodCandidate } from "./portion";

export interface Suggestion {
  food: FoodCandidate;
  nutrition: NutritionTotals;
  reason: "protein" | "fits";
}

/**
 * Rule-based (not AI) suggestions from the user's own saved foods:
 * - only foods whose usual portion fits the remaining calories (+10 %);
 * - if ≥ 20 g of protein are still missing, rank by protein per kcal;
 * - otherwise rank by how often the food is used.
 */
export function suggestFromSaved(
  foods: readonly FoodItem[],
  remaining: NutritionTotals,
  limit = 3,
): Suggestion[] {
  if (remaining.calories < 50) return [];
  const proteinFocus = remaining.protein >= 20;
  return foods
    .map((item) => {
      const food = candidateFromItem(item);
      const nutrition = nutritionFor(food, defaultAmount(food));
      return { item, food, nutrition };
    })
    .filter(({ nutrition }) => nutrition.calories > 0 && nutrition.calories <= remaining.calories * 1.1)
    .sort((a, b) =>
      proteinFocus
        ? b.nutrition.protein / b.nutrition.calories - a.nutrition.protein / a.nutrition.calories
        : b.item.useCount - a.item.useCount,
    )
    .slice(0, limit)
    .map(({ food, nutrition }) => ({ food, nutrition, reason: proteinFocus ? "protein" : "fits" }));
}
