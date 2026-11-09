import "fake-indexeddb/auto";
import Dexie from "dexie";
import { describe, expect, it } from "vitest";
import { NutriTrackDB } from "./database";

/** Users already have v1 data on their phones; upgrading must keep it. */
describe("schema migration v1 → v3", () => {
  it("keeps existing entries and adds the new tables", async () => {
    const v1 = new Dexie("nutritrack");
    v1.version(1).stores({
      foodEntries: "++id, date, meal, [date+meal], createdAt",
      weightEntries: "++id, date, createdAt",
      settings: "&key",
    });
    await v1.table("foodEntries").add({
      date: "2026-11-08", meal: "almuerzo", name: "Pollo", calories: 300,
      protein: 40, carbs: 0, fat: 10, source: "manual", createdAt: 1,
    });
    await v1.table("weightEntries").add({ date: "2026-11-08", weightKg: 81, createdAt: 1 });
    await v1.table("settings").put({ key: "goals", value: { calories: 1900 } });
    v1.close();

    const db = new NutriTrackDB();
    await db.open();
    expect(db.verno).toBe(3);
    expect(await db.foodEntries.count()).toBe(1);
    expect((await db.foodEntries.toArray())[0].name).toBe("Pollo");
    expect(await db.weightEntries.count()).toBe(1);
    expect((await db.settings.get("goals"))?.value).toEqual({ calories: 1900 });

    await db.foods.put({ key: "k", name: "x", favorite: 0, useCount: 1, lastUsed: 1, source: "manual" });
    await db.waterEntries.add({ date: "2026-11-09", ml: 250, createdAt: 1 });
    await db.exerciseEntries.add({ date: "2026-11-09", type: "walk", label: "Caminar", minutes: 30, kcal: 140, createdAt: 1 });
    expect(await db.waterEntries.count()).toBe(1);
    expect(await db.exerciseEntries.count()).toBe(1);
    expect(await db.foodEntries.where("foodKey").equals("k").count()).toBe(0);
    db.close();
  });
});
