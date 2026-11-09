export type MealType = "desayuno" | "almuerzo" | "once" | "cena";

/** Where a food entry came from. AI-backed sources arrive in a later phase. */
export type EntrySource = "manual" | "photo" | "barcode" | "label";

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
  source: EntrySource;
  createdAt: number;
}

export interface WeightEntry {
  id?: number;
  date: string;
  weightKg: number;
  createdAt: number;
}

export interface Goals extends NutritionTotals {
  targetWeightKg?: number;
}

export interface SettingRecord<T = unknown> {
  key: string;
  value: T;
}
