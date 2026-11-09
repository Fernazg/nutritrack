export type MealType = "desayuno" | "almuerzo" | "once" | "cena" | "colacion";

/** Where a food entry came from. */
export type EntrySource = "manual" | "photo" | "barcode" | "label" | "search";

export interface Macros {
  protein: number; // g
  carbs: number; // g
  fat: number; // g
}

export interface NutritionTotals extends Macros {
  calories: number; // kcal
}

export interface FoodEntry extends NutritionTotals {
  id?: number;
  /** Local calendar day, YYYY-MM-DD */
  date: string;
  meal: MealType;
  name: string;
  quantity?: string;
  /** Grams eaten, when the food was logged by weight. */
  grams?: number;
  /** Link to the saved food (FoodItem.key) for recents/favorites. */
  foodKey?: string;
  source: EntrySource;
  createdAt: number;
}

/**
 * A reusable food: either per-100 g data (scaled by grams) or a fixed
 * serving (manual entries without weight).
 */
export interface FoodItem {
  key: string;
  name: string;
  brand?: string;
  barcode?: string;
  per100g?: NutritionTotals;
  serving?: NutritionTotals;
  servingLabel?: string;
  /** Last grams used, to prefill next time. */
  lastGrams?: number;
  favorite: 0 | 1;
  useCount: number;
  lastUsed: number;
  source: EntrySource;
}

export interface WeightEntry {
  id?: number;
  date: string;
  weightKg: number;
  createdAt: number;
}

export interface WaterEntry {
  id?: number;
  date: string;
  ml: number;
  createdAt: number;
}

export interface ExerciseEntry {
  id?: number;
  date: string;
  /** ActivityType id (see lib/nutrition/activity). */
  type: string;
  label: string;
  minutes: number;
  /** Estimated gross kcal at the time of logging. */
  kcal: number;
  createdAt: number;
}

export interface Goals extends NutritionTotals {
  targetWeightKg?: number;
  waterMl?: number;
}

export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type GoalType = "lose" | "maintain" | "gain";

export interface Profile {
  sex: Sex;
  birthYear: number;
  heightCm: number;
  activity: ActivityLevel;
  goal: GoalType;
  /** kg per week (positive number), used for lose/gain. */
  rateKgPerWeek: number;
  /** g of protein per kg of reference body weight. */
  proteinPerKg: number;
}

export interface SettingRecord<T = unknown> {
  key: string;
  value: T;
}
