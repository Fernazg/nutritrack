import { describe, expect, it } from "vitest";
import { buildPhotoPrompt, parsePhotoResponse, photoCandidate } from "./photo";
import { nutritionFor } from "./portion";

const RICE = 168878; // Arroz blanco cocido (USDA SR Legacy)

describe("buildPhotoPrompt", () => {
  it("lists the USDA foods with their ids and asks for JSON", () => {
    const p = buildPhotoPrompt();
    expect(p).toContain(`${RICE}|Arroz blanco cocido`);
    expect(p).toContain('"id_usda"');
  });
});

describe("parsePhotoResponse", () => {
  it("keeps valid items and USDA ids that exist", () => {
    const r = parsePhotoResponse({
      es_comida: true,
      alimentos: [
        { nombre: "Arroz", gramos: 150.4, id_usda: RICE, kcal_100g: 130, proteina_100g: 2.7, carbohidratos_100g: 28, grasa_100g: 0.3 },
        { nombre: "Pastel de choclo", gramos: 350, id_usda: null, kcal_100g: 160, proteina_100g: 8, carbohidratos_100g: 15, grasa_100g: 7.5 },
      ],
      nota: "No se ve el aceite.",
    });
    expect(r.isFood).toBe(true);
    expect(r.items).toEqual([
      { name: "Arroz", grams: 150, fdcId: RICE, estimate: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 } },
      { name: "Pastel de choclo", grams: 350, fdcId: null, estimate: { calories: 160, protein: 8, carbs: 15, fat: 7.5 } },
    ]);
    expect(r.note).toBe("No se ve el aceite.");
  });

  it("drops unknown ids, implausible values and malformed entries", () => {
    const r = parsePhotoResponse({
      alimentos: [
        { nombre: "Inventado", gramos: 100, id_usda: 999999999 }, // unknown id, no estimate → dropped
        { nombre: "Gigante", gramos: 9000, id_usda: RICE }, // grams out of range
        { nombre: "Raro", gramos: 100, id_usda: null, kcal_100g: 100, proteina_100g: 80, carbohidratos_100g: 50, grasa_100g: 0 }, // macros > 100 g
        { nombre: "", gramos: 100, id_usda: RICE },
        "texto",
        null,
        { nombre: "Arroz", gramos: 100, id_usda: 999999999, kcal_100g: 130, proteina_100g: 2.7, carbohidratos_100g: 28, grasa_100g: 0.3 },
      ],
    });
    expect(r.items).toEqual([
      { name: "Arroz", grams: 100, fdcId: null, estimate: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 } },
    ]);
  });

  it("reports non-food photos and garbage", () => {
    expect(parsePhotoResponse({ es_comida: false, alimentos: [] }).isFood).toBe(false);
    expect(parsePhotoResponse(null)).toEqual({ isFood: false, items: [] });
    expect(parsePhotoResponse("hola").items).toEqual([]);
  });
});

describe("photoCandidate", () => {
  it("uses USDA values when matched, ignoring the AI estimate", () => {
    const c = photoCandidate({ name: "Arroz", grams: 158, fdcId: RICE, estimate: { calories: 999, protein: 0, carbs: 0, fat: 0 } });
    expect(c.source).toBe("generic");
    expect(c.name).toBe("Arroz blanco cocido");
    expect(nutritionFor(c, 158).calories).toBe(205);
  });

  it("falls back to the labelled AI estimate", () => {
    const c = photoCandidate({ name: "Pastel de choclo", grams: 350, fdcId: null, estimate: { calories: 160, protein: 8, carbs: 15, fat: 7.5 } });
    expect(c.source).toBe("photo");
    expect(nutritionFor(c, 350).calories).toBe(560);
  });
});
