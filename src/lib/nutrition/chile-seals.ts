/**
 * Reference "ALTO EN" warning seals (Chile, Ley 20.606 / Decreto 13/2015,
 * final limits in force since June 2019), per 100 g or 100 ml.
 *
 * Officially the seals apply only to products with added sugars, sodium or
 * saturated fat; we can't know that from the data, so the result is shown
 * as a reference ("referencial"), never as the official label.
 */

export interface LabelExtras {
  sugars?: number; // g / 100
  saturatedFat?: number; // g / 100
  sodiumMg?: number; // mg / 100
}

export type Seal = "calorias" | "azucares" | "grasas_saturadas" | "sodio";

export const SEAL_LABELS: Record<Seal, string> = {
  calorias: "Calorías",
  azucares: "Azúcares",
  grasas_saturadas: "Grasas saturadas",
  sodio: "Sodio",
};

export const LIMITS = {
  solid: { kcal: 275, sugars: 10, saturatedFat: 4, sodiumMg: 400 },
  liquid: { kcal: 70, sugars: 5, saturatedFat: 3, sodiumMg: 100 },
} as const;

export function referenceSeals(kcalPer100: number, extras: LabelExtras, isLiquid: boolean): Seal[] {
  const l = isLiquid ? LIMITS.liquid : LIMITS.solid;
  const seals: Seal[] = [];
  if (kcalPer100 > l.kcal) seals.push("calorias");
  if ((extras.sugars ?? 0) > l.sugars) seals.push("azucares");
  if ((extras.saturatedFat ?? 0) > l.saturatedFat) seals.push("grasas_saturadas");
  if ((extras.sodiumMg ?? 0) > l.sodiumMg) seals.push("sodio");
  return seals;
}

/** Heuristic: quantities expressed in ml/cl/l are treated as liquids. */
export function looksLiquid(...texts: (string | undefined)[]): boolean {
  return texts.some((t) => !!t && /\d\s*(ml|cl|l|lt|litros?)\b/i.test(t));
}
