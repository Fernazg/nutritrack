import { GENERIC_FOODS, genericCandidate, type GenericFood } from "./generic-foods";
import type { FoodCandidate } from "./portion";
import type { NutritionTotals } from "@/types/nutrition";

/**
 * Meal-photo analysis. The AI only identifies foods and estimates grams;
 * whenever a food matches our USDA list, its verified values are used. The
 * AI's own per-100 g numbers are a labelled fallback ("estimación").
 */

/** One food detected in a photo, as returned by /api/ia/foto. */
export interface PhotoItem {
  /** What the AI saw, in Spanish. */
  name: string;
  grams: number;
  /** USDA FoodData Central id from our generic list, when it matches. */
  fdcId: number | null;
  /** AI estimate per 100 g (used only when fdcId is null). */
  estimate: NutritionTotals | null;
}

export interface PhotoAnalysis {
  isFood: boolean;
  items: PhotoItem[];
  note?: string;
}

export function buildPhotoPrompt(foods: readonly GenericFood[] = GENERIC_FOODS): string {
  const list = foods.map((g) => `${g.id}|${g.name}`).join("\n");
  return [
    "Analiza la foto de una comida (contexto: Chile). Identifica cada alimento visible y estima su peso en gramos tal como se sirvió (cocido si está cocido).",
    "Incluye aceite, mayonesa, salsas o pan si se ven. No inventes alimentos que no se vean.",
    "Para cada alimento, si corresponde claramente a uno de esta lista (mismo alimento y preparación similar), indica su id en id_usda; si no, usa null:",
    list,
    "Además, entrega siempre tu estimación por 100 g (kcal, proteína, carbohidratos y grasa).",
    "Si la foto no muestra comida, responde es_comida=false y alimentos=[].",
    "En nota, una frase breve con lo que más afecta la precisión (por ejemplo, aceite no visible o porción tapada), o cadena vacía.",
    'Responde SOLO JSON: {"es_comida":boolean,"alimentos":[{"nombre":string,"gramos":number,"id_usda":number|null,"kcal_100g":number,"proteina_100g":number,"carbohidratos_100g":number,"grasa_100g":number}],"nota":string}',
  ].join("\n");
}

const num = (v: unknown, min: number, max: number): number | null =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : null;

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Validates the model's JSON. Drops anything malformed or implausible
 * instead of trusting it; unknown USDA ids become null.
 */
export function parsePhotoResponse(raw: unknown, foods: readonly GenericFood[] = GENERIC_FOODS): PhotoAnalysis {
  const ids = new Set(foods.map((g) => g.id));
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const list = Array.isArray(obj.alimentos) ? obj.alimentos : [];
  const items: PhotoItem[] = [];
  for (const a of list.slice(0, 12)) {
    if (!a || typeof a !== "object") continue;
    const it = a as Record<string, unknown>;
    const name = typeof it.nombre === "string" ? it.nombre.trim().slice(0, 80) : "";
    const grams = num(it.gramos, 1, 2000);
    if (!name || grams === null) continue;
    const id = typeof it.id_usda === "number" && ids.has(it.id_usda) ? it.id_usda : null;
    const kcal = num(it.kcal_100g, 0, 900);
    const p = num(it.proteina_100g, 0, 100);
    const c = num(it.carbohidratos_100g, 0, 100);
    const f = num(it.grasa_100g, 0, 100);
    const estimate =
      kcal !== null && p !== null && c !== null && f !== null && p + c + f <= 100.5
        ? { calories: Math.round(kcal), protein: r1(p), carbs: r1(c), fat: r1(f) }
        : null;
    if (id === null && !estimate) continue; // nothing usable to log
    items.push({ name, grams: Math.round(grams), fdcId: id, estimate });
  }
  const note = typeof obj.nota === "string" ? obj.nota.trim().slice(0, 200) : "";
  return { isFood: obj.es_comida !== false && items.length > 0, items, ...(note ? { note } : {}) };
}

/** Turns a detected item into something loggable: USDA values first, else the estimate. */
export function photoCandidate(item: PhotoItem, foods: readonly GenericFood[] = GENERIC_FOODS): FoodCandidate {
  const g = item.fdcId !== null ? foods.find((f) => f.id === item.fdcId) : undefined;
  if (g) return genericCandidate(g);
  return { name: item.name, per100g: item.estimate ?? undefined, source: "photo" };
}
