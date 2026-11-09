import { describe, expect, it } from "vitest";
import { looksLiquid, referenceSeals } from "./chile-seals";

describe("referenceSeals", () => {
  it("uses solid limits (275 kcal, 10 g sugar, 4 g sat. fat, 400 mg sodium)", () => {
    expect(referenceSeals(480, { sugars: 30, saturatedFat: 8, sodiumMg: 300 }, false)).toEqual([
      "calorias", "azucares", "grasas_saturadas",
    ]);
    expect(referenceSeals(275, { sugars: 10, saturatedFat: 4, sodiumMg: 400 }, false)).toEqual([]);
  });
  it("uses liquid limits (70 kcal, 5 g sugar, 3 g sat. fat, 100 mg sodium)", () => {
    expect(referenceSeals(43, { sugars: 10.6, sodiumMg: 10 }, true)).toEqual(["azucares"]);
    expect(referenceSeals(34, { sugars: 4.7, saturatedFat: 0.1, sodiumMg: 40 }, true)).toEqual([]);
  });
  it("ignores missing values", () => {
    expect(referenceSeals(100, {}, false)).toEqual([]);
  });
});

describe("looksLiquid", () => {
  it("detects ml / l quantities", () => {
    expect(looksLiquid("200ml")).toBe(true);
    expect(looksLiquid(undefined, "1 L")).toBe(true);
    expect(looksLiquid("30 g")).toBe(false);
    expect(looksLiquid(undefined)).toBe(false);
  });
});
