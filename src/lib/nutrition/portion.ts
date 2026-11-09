import type { EntrySource, FoodItem, NutritionTotals } from "@/types/nutrition";

/** Anything that can be logged: a saved food, a search hit or a scanned product. */
export interface FoodCandidate {
  key?: string;
  name: string;
  brand?: string;
  barcode?: string;
  per100g?: NutritionTotals;
  serving?: NutritionTotals;
  servingLabel?: string;
  servingGrams?: number;
  lastGrams?: number;
  favorite?: boolean;
  source: EntrySource;
}

export function candidateFromItem(item: FoodItem): FoodCandidate {
  return {
    key: item.key,
    name: item.name,
    brand: item.brand,
    barcode: item.barcode,
    per100g: item.per100g,
    serving: item.serving,
    servingLabel: item.servingLabel,
    lastGrams: item.lastGrams,
    favorite: item.favorite === 1,
    source: item.source,
  };
}

/** True when the food is measured in grams (per-100 g data available). */
export function isByWeight(c: Pick<FoodCandidate, "per100g">): boolean {
  return !!c.per100g;
}

/** Default amount: last grams used → declared serving → 100 g; or 1 serving. */
export function defaultAmount(c: FoodCandidate): number {
  if (!isByWeight(c)) return 1;
  return c.lastGrams ?? c.servingGrams ?? 100;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Nutrition for an amount: grams when the food has per-100 g data,
 * otherwise a number of servings.
 */
export function nutritionFor(c: FoodCandidate, amount: number): NutritionTotals {
  const base = c.per100g ?? c.serving;
  if (!base || !(amount > 0)) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const factor = c.per100g ? amount / 100 : amount;
  return {
    calories: Math.round(base.calories * factor),
    protein: r1(base.protein * factor),
    carbs: r1(base.carbs * factor),
    fat: r1(base.fat * factor),
  };
}

/** Human label for what was eaten, e.g. "150 g" or "2 porciones". */
export function amountLabel(c: FoodCandidate, amount: number): string {
  if (isByWeight(c)) return `${r1(amount)} g`.replace(".", ",");
  const n = `${r1(amount)}`.replace(".", ",");
  const unit = c.servingLabel ? ` × ${c.servingLabel}` : amount === 1 ? " porción" : " porciones";
  return `${n}${unit}`;
}
