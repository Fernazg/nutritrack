import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { normalizeProduct } = await import("./openfoodfacts");

describe("normalizeProduct", () => {
  it("extracts label extras (sodium g → mg) and detects liquids", () => {
    const f = normalizeProduct({
      code: "1", product_name: "Bebida", serving_size: "200ml",
      nutriments: { "energy-kcal_100g": 43, sugars_100g: 10.6, sodium_100g: 0.01 },
    });
    expect(f?.extras).toEqual({ sugars: 10.6, saturatedFat: undefined, sodiumMg: 10 });
    expect(f?.isLiquid).toBe(true);
  });
  it("maps per-100 g nutrition and brand", () => {
    const f = normalizeProduct({
      code: "7802920000084",
      product_name: "Leche descremada colun",
      brands: ["Colun"],
      nutriments: { "energy-kcal_100g": 43, proteins_100g: 3.2, carbohydrates_100g: 4.6, fat_100g: 1.3 },
      serving_quantity: 200,
    });
    expect(f).toEqual({
      barcode: "7802920000084",
      name: "Leche descremada colun",
      brand: "Colun",
      per100g: { calories: 43, protein: 3.2, carbs: 4.6, fat: 1.3 },
      servingGrams: 200,
      servingLabel: undefined,
      extras: undefined,
      isLiquid: false,
    });
  });
  it("derives kcal from kJ when kcal is missing", () => {
    const f = normalizeProduct({ code: "1", product_name: "X", nutriments: { "energy-kj_100g": 418.4 } });
    expect(f?.per100g.calories).toBe(100);
  });
  it("rejects products without energy or name", () => {
    expect(normalizeProduct({ code: "1", product_name: "X", nutriments: {} })).toBeNull();
    expect(normalizeProduct({ code: "1", nutriments: { "energy-kcal_100g": 10 } })).toBeNull();
  });
  it("prefers the Spanish name and first brand of a CSV list", () => {
    const f = normalizeProduct({
      code: "1", product_name: "Milk", product_name_es: "Leche", brands: "Colun, Otra",
      nutriments: { "energy-kcal_100g": 40 },
    });
    expect(f?.name).toBe("Leche");
    expect(f?.brand).toBe("Colun");
  });
});
