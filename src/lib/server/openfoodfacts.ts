import "server-only";
import type { NutritionTotals } from "@/types/nutrition";
import { looksLiquid, type LabelExtras } from "@/lib/nutrition/chile-seals";

/**
 * Open Food Facts client (free, open data under ODbL — attribution required).
 * Docs: https://openfoodfacts.github.io/openfoodfacts-server/api/
 * They ask for a descriptive User-Agent and moderate request rates.
 */
const USER_AGENT = "NutriTrack/0.3 (uso personal; https://github.com/Fernazg/nutritrack)";
const FIELDS = "code,product_name,product_name_es,brands,nutriments,serving_quantity,serving_size,quantity";
const TIMEOUT_MS = 8000;

export interface OffFood {
  barcode: string;
  name: string;
  brand?: string;
  per100g: NutritionTotals;
  servingGrams?: number;
  servingLabel?: string;
  extras?: LabelExtras;
  isLiquid?: boolean;
}

interface OffNutriments {
  "energy-kcal_100g"?: number;
  "energy-kj_100g"?: number;
  energy_100g?: number; // kJ
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
  sugars_100g?: number;
  "saturated-fat_100g"?: number;
  sodium_100g?: number; // grams
}

interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_es?: string;
  brands?: string | string[];
  nutriments?: OffNutriments;
  serving_quantity?: number | string;
  serving_size?: string;
  quantity?: string;
}

const num = (v: unknown): number | undefined => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : undefined;
};

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Maps an OFF product to our shape; null if it lacks usable nutrition. */
export function normalizeProduct(p: OffProduct): OffFood | null {
  const n = p.nutriments ?? {};
  const kj = num(n["energy-kj_100g"]) ?? num(n.energy_100g);
  const kcal = num(n["energy-kcal_100g"]) ?? (kj !== undefined ? kj / 4.184 : undefined);
  const name = (p.product_name_es || p.product_name || "").trim();
  if (!p.code || !name || kcal === undefined) return null;
  const brand = Array.isArray(p.brands) ? p.brands[0] : p.brands?.split(",")[0];
  const serving = num(p.serving_quantity);
  return {
    barcode: p.code,
    name,
    brand: brand?.trim() || undefined,
    per100g: {
      calories: Math.round(kcal),
      protein: r1(num(n.proteins_100g) ?? 0),
      carbs: r1(num(n.carbohydrates_100g) ?? 0),
      fat: r1(num(n.fat_100g) ?? 0),
    },
    servingGrams: serving && serving > 0 && serving < 2000 ? serving : undefined,
    servingLabel: p.serving_size?.trim() || undefined,
    extras: extrasOf(n),
    isLiquid: looksLiquid(p.serving_size, p.quantity),
  };
}

function extrasOf(n: OffNutriments): LabelExtras | undefined {
  const sugars = num(n.sugars_100g);
  const saturatedFat = num(n["saturated-fat_100g"]);
  const sodium = num(n.sodium_100g);
  if (sugars === undefined && saturatedFat === undefined && sodium === undefined) return undefined;
  return {
    sugars: sugars !== undefined ? r1(sugars) : undefined,
    saturatedFat: saturatedFat !== undefined ? r1(saturatedFat) : undefined,
    sodiumMg: sodium !== undefined ? Math.round(sodium * 1000) : undefined,
  };
}

async function offFetch(url: string): Promise<Response> {
  return fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

export async function getProductByBarcode(barcode: string): Promise<OffFood | null> {
  const res = await offFetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`,
  );
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`OFF ${res.status}`);
  }
  const data = (await res.json()) as { status?: number; product?: OffProduct };
  if (data.status !== 1 || !data.product) return null;
  return normalizeProduct({ code: barcode, ...data.product });
}

/** Full-text search via Search-a-licious (search.openfoodfacts.org). */
export async function searchProducts(query: string): Promise<OffFood[]> {
  const url = new URL("https://search.openfoodfacts.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("page_size", "25");
  url.searchParams.set("langs", "es");
  url.searchParams.set("fields", FIELDS);
  const res = await offFetch(url.toString());
  if (!res.ok) throw new Error(`OFF search ${res.status}`);
  const data = (await res.json()) as { hits?: OffProduct[] };
  const seen = new Set<string>();
  return (data.hits ?? [])
    .map(normalizeProduct)
    .filter((f): f is OffFood => {
      if (!f || seen.has(f.barcode)) return false;
      seen.add(f.barcode);
      return true;
    });
}
