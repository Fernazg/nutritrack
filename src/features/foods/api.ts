"use client";

import type { FoodCandidate } from "@/lib/nutrition/portion";
import type { NutritionTotals } from "@/types/nutrition";

/** Shape returned by our /api/alimentos routes (see lib/server/openfoodfacts). */
interface ApiFood {
  barcode: string;
  name: string;
  brand?: string;
  per100g: NutritionTotals;
  servingGrams?: number;
  servingLabel?: string;
}

const toCandidate = (f: ApiFood, source: FoodCandidate["source"]): FoodCandidate => ({ ...f, source });

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    if (body.error) return body.error;
  } catch {
    /* ignore */
  }
  return "No se pudo conectar. Revisa tu conexión.";
}

export async function searchFoodsOnline(q: string): Promise<FoodCandidate[]> {
  let res: Response;
  try {
    res = await fetch(`/api/alimentos/buscar?q=${encodeURIComponent(q)}`);
  } catch {
    throw new Error("Sin conexión. La búsqueda en línea necesita internet.");
  }
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { results: ApiFood[] };
  return data.results.map((f) => toCandidate(f, "search"));
}

/** null when the product isn't in Open Food Facts. */
export async function lookupBarcode(code: string): Promise<FoodCandidate | null> {
  let res: Response;
  try {
    res = await fetch(`/api/alimentos/codigo/${encodeURIComponent(code)}`);
  } catch {
    throw new Error("Sin conexión. Buscar un código necesita internet.");
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { product: ApiFood };
  return toCandidate(data.product, "barcode");
}
