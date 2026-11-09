import type { ActivityLevel, GoalType, Goals, Profile, Sex } from "@/types/nutrition";

/**
 * Energy & macro targets. Estimates only — not medical advice.
 *
 * - BMR: Mifflin-St Jeor (Mifflin et al., Am J Clin Nutr 1990). Frankenfield
 *   et al. (J Am Diet Assoc 2005) found it the most accurate of the common
 *   equations, while warning about individual error.
 * - TDEE: BMR × physical activity factor (standard 1.2–1.9 multipliers).
 * - Energy per kg of body-weight change: ~7700 kcal (classic approximation;
 *   real-world loss slows over time due to adaptation).
 * - Protein: g/kg of a reference weight (default 1.6 g/kg, editable;
 *   ISSN position stands support 1.6–2.2 g/kg with resistance training).
 */

export const ACTIVITY_LEVELS: Record<ActivityLevel, { label: string; hint: string; factor: number }> = {
  sedentary: { label: "Sedentario", hint: "Poco o nada de ejercicio", factor: 1.2 },
  light: { label: "Ligero", hint: "Ejercicio 1–3 días/semana", factor: 1.375 },
  moderate: { label: "Moderado", hint: "Ejercicio 3–5 días/semana", factor: 1.55 },
  active: { label: "Activo", hint: "Ejercicio intenso 6–7 días/semana", factor: 1.725 },
  very_active: { label: "Muy activo", hint: "Trabajo físico + entrenamiento diario", factor: 1.9 },
};

export const KCAL_PER_KG = 7700;
/** Never plan a deficit larger than this fraction of TDEE. */
export const MAX_DEFICIT_FRACTION = 0.25;
/** Common lower bounds for unsupervised diets. */
export const MIN_KCAL: Record<Sex, number> = { female: 1200, male: 1500 };
export const FAT_FRACTION = 0.25;
/** EFSA-style rule of thumb used by many apps: ~35 ml/kg/day. */
export const WATER_ML_PER_KG = 35;

export interface BmrInput {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
}

export function bmrMifflin({ sex, weightKg, heightCm, age }: BmrInput): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return base + (sex === "male" ? 5 : -161);
}

export function tdee(bmr: number, activity: ActivityLevel): number {
  return bmr * ACTIVITY_LEVELS[activity].factor;
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

/**
 * Weight used for protein targets. For BMI ≥ 30, protein per kg of total
 * weight overshoots, so we use the weight at BMI 25 as reference.
 */
export function referenceWeight(weightKg: number, heightCm: number): number {
  if (bmi(weightKg, heightCm) < 30) return weightKg;
  const m = heightCm / 100;
  return 25 * m * m;
}

export type PlanWarning = "deficit_capped" | "floor_applied" | "carbs_low";

export interface Plan {
  bmr: number;
  tdee: number;
  /** Planned daily energy change vs TDEE (negative = deficit). */
  adjustment: number;
  /** Resulting expected weekly change in kg (negative = loss). */
  expectedKgPerWeek: number;
  goals: Required<Pick<Goals, "calories" | "protein" | "carbs" | "fat" | "waterMl">>;
  warnings: PlanWarning[];
}

export function ageFromBirthYear(birthYear: number, now = new Date()): number {
  return now.getFullYear() - birthYear;
}

export function computePlan(profile: Profile, weightKg: number, now = new Date()): Plan {
  const age = ageFromBirthYear(profile.birthYear, now);
  const bmr = bmrMifflin({ sex: profile.sex, weightKg, heightCm: profile.heightCm, age });
  const maintenance = tdee(bmr, profile.activity);
  const warnings: PlanWarning[] = [];

  let adjustment = 0;
  if (profile.goal === "lose") {
    adjustment = -(profile.rateKgPerWeek * KCAL_PER_KG) / 7;
    const maxDeficit = maintenance * MAX_DEFICIT_FRACTION;
    if (-adjustment > maxDeficit) {
      adjustment = -maxDeficit;
      warnings.push("deficit_capped");
    }
  } else if (profile.goal === "gain") {
    adjustment = (profile.rateKgPerWeek * KCAL_PER_KG) / 7;
  }

  let calories = maintenance + adjustment;
  const floor = MIN_KCAL[profile.sex];
  if (calories < floor) {
    calories = floor;
    adjustment = calories - maintenance;
    warnings.push("floor_applied");
  }
  calories = Math.round(calories / 10) * 10;

  const protein = Math.round(profile.proteinPerKg * referenceWeight(weightKg, profile.heightCm));
  const fat = Math.round((calories * FAT_FRACTION) / 9);
  let carbs = Math.round((calories - protein * 4 - fat * 9) / 4);
  if (carbs < 50) warnings.push("carbs_low");
  carbs = Math.max(carbs, 0);

  const waterMl = Math.round((weightKg * WATER_ML_PER_KG) / 250) * 250;

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(maintenance),
    adjustment: Math.round(adjustment),
    expectedKgPerWeek: Math.round(((adjustment * 7) / KCAL_PER_KG) * 100) / 100,
    goals: { calories, protein, carbs, fat, waterMl },
    warnings,
  };
}

export const GOAL_LABELS: Record<GoalType, string> = {
  lose: "Perder grasa",
  maintain: "Mantener",
  gain: "Ganar masa",
};

export const DEFAULT_PROFILE: Omit<Profile, "sex" | "birthYear" | "heightCm"> = {
  activity: "light",
  goal: "lose",
  rateKgPerWeek: 0.5,
  proteinPerKg: 1.6,
};
