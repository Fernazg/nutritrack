import { getDB } from "./database";
import type {
  FoodEntry,
  FoodItem,
  Goals,
  NutritionTotals,
  Profile,
  SettingRecord,
  WaterEntry,
  WeightEntry,
} from "@/types/nutrition";

/**
 * All writes go through this module so UI components never touch Dexie
 * directly. Reads live in ./hooks (reactive via useLiveQuery).
 */

export type FoodEntryInput = Omit<FoodEntry, "id" | "createdAt">;

let persistRequested = false;

/**
 * Ask the browser not to evict our data under storage pressure.
 * Best effort: iOS grants it mostly for installed (home screen) apps.
 */
async function requestPersistence() {
  if (persistRequested) return;
  persistRequested = true;
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    /* non-fatal */
  }
}

// ---- Saved foods (recents / favorites) ----------------------------------

/** Stable key: barcode when known, otherwise normalized name + brand. */
export function foodKeyFor(name: string, brand?: string, barcode?: string): string {
  if (barcode) return `bc:${barcode}`;
  const norm = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
  return `nm:${norm(name)}|${norm(brand ?? "")}`;
}

export interface FoodItemInput {
  name: string;
  brand?: string;
  barcode?: string;
  per100g?: NutritionTotals;
  serving?: NutritionTotals;
  servingLabel?: string;
  lastGrams?: number;
  source: FoodItem["source"];
}

/** Insert or refresh a saved food, bumping its usage stats. */
export async function touchFood(input: FoodItemInput): Promise<string> {
  const db = getDB();
  const key = foodKeyFor(input.name, input.brand, input.barcode);
  const existing = await db.foods.get(key);
  const item: FoodItem = {
    ...existing,
    ...input,
    key,
    favorite: existing?.favorite ?? 0,
    useCount: (existing?.useCount ?? 0) + 1,
    lastUsed: Date.now(),
  };
  await db.foods.put(item);
  return key;
}

export async function setFavorite(key: string, favorite: boolean) {
  await getDB().foods.update(key, { favorite: favorite ? 1 : 0 });
}

export async function deleteFood(key: string) {
  await getDB().foods.delete(key);
}

// ---- Food entries -------------------------------------------------------

export async function addFoodEntry(input: FoodEntryInput): Promise<number> {
  void requestPersistence();
  const id = await getDB().foodEntries.add({ ...input, createdAt: Date.now() });
  return id as number;
}

/**
 * Logs an entry and remembers the food for quick re-logging.
 * Manual entries without grams are saved as a fixed serving.
 */
export async function logFood(
  entry: Omit<FoodEntryInput, "foodKey">,
  food: Omit<FoodItemInput, "source">,
): Promise<number> {
  const key = await touchFood({ ...food, source: entry.source });
  return addFoodEntry({ ...entry, foodKey: key });
}

export async function updateFoodEntry(id: number, changes: Partial<FoodEntryInput>) {
  await getDB().foodEntries.update(id, changes);
}

export async function deleteFoodEntry(id: number) {
  await getDB().foodEntries.delete(id);
}

/** Copies every entry of a meal from one day to another (e.g. "repetir ayer"). */
export async function copyMeal(fromDate: string, toDate: string, meal: FoodEntry["meal"]) {
  const db = getDB();
  const source = await db.foodEntries.where("[date+meal]").equals([fromDate, meal]).toArray();
  const now = Date.now();
  await db.foodEntries.bulkAdd(
    source.map((e, i) => {
      const copy: FoodEntry = { ...e, date: toDate, createdAt: now + i };
      delete copy.id; // let IndexedDB assign new ids
      return copy;
    }),
  );
  return source.length;
}

// ---- Water --------------------------------------------------------------

export async function addWater(date: string, ml: number) {
  void requestPersistence();
  await getDB().waterEntries.add({ date, ml, createdAt: Date.now() });
}

/** Removes the most recent water entry of the day (undo). */
export async function undoLastWater(date: string) {
  const db = getDB();
  const last = await db.waterEntries.where("date").equals(date).last();
  if (last?.id !== undefined) await db.waterEntries.delete(last.id);
}

// ---- Weight -------------------------------------------------------------

/** One weight per day: saving on a date that already has one replaces it. */
export async function saveWeight(date: string, weightKg: number) {
  void requestPersistence();
  const db = getDB();
  const existing = await db.weightEntries.where("date").equals(date).first();
  if (existing?.id !== undefined) {
    await db.weightEntries.update(existing.id, { weightKg });
  } else {
    await db.weightEntries.add({ date, weightKg, createdAt: Date.now() });
  }
}

export async function deleteWeight(id: number) {
  await getDB().weightEntries.delete(id);
}

// ---- Settings -----------------------------------------------------------

export async function saveGoals(goals: Goals) {
  void requestPersistence();
  await getDB().settings.put({ key: "goals", value: goals });
}

export async function saveProfile(profile: Profile) {
  void requestPersistence();
  await getDB().settings.put({ key: "profile", value: profile });
}

// ---- Data management ----------------------------------------------------

export interface ExportFile {
  app: "nutritrack";
  version: 2;
  exportedAt: string;
  foodEntries: FoodEntry[];
  weightEntries: WeightEntry[];
  waterEntries: WaterEntry[];
  foods: FoodItem[];
  settings: SettingRecord[];
}

export async function exportAll(): Promise<ExportFile> {
  const db = getDB();
  const [foodEntries, weightEntries, waterEntries, foods, settings] = await Promise.all([
    db.foodEntries.toArray(),
    db.weightEntries.toArray(),
    db.waterEntries.toArray(),
    db.foods.toArray(),
    db.settings.toArray(),
  ]);
  return {
    app: "nutritrack",
    version: 2,
    exportedAt: new Date().toISOString(),
    foodEntries,
    weightEntries,
    waterEntries,
    foods,
    settings,
  };
}

/**
 * Replaces all local data with an export file (v1 or v2).
 * Validates shape first so a wrong file can't wipe the database.
 */
export async function importAll(raw: unknown): Promise<{ entries: number }> {
  const data = raw as Partial<ExportFile> & { version?: number };
  if (!data || data.app !== "nutritrack" || !Array.isArray(data.foodEntries)) {
    throw new Error("El archivo no es un respaldo válido de NutriTrack.");
  }
  const db = getDB();
  await db.transaction(
    "rw",
    [db.foodEntries, db.weightEntries, db.waterEntries, db.foods, db.settings],
    async () => {
      await Promise.all([
        db.foodEntries.clear(),
        db.weightEntries.clear(),
        db.waterEntries.clear(),
        db.foods.clear(),
        db.settings.clear(),
      ]);
      await db.foodEntries.bulkAdd(data.foodEntries ?? []);
      await db.weightEntries.bulkAdd(data.weightEntries ?? []);
      await db.waterEntries.bulkAdd(data.waterEntries ?? []);
      await db.foods.bulkPut(data.foods ?? []);
      await db.settings.bulkPut(data.settings ?? []);
    },
  );
  return { entries: data.foodEntries.length };
}

export async function clearAll() {
  const db = getDB();
  await db.transaction(
    "rw",
    [db.foodEntries, db.weightEntries, db.waterEntries, db.foods, db.settings],
    async () => {
      await Promise.all([
        db.foodEntries.clear(),
        db.weightEntries.clear(),
        db.waterEntries.clear(),
        db.foods.clear(),
        db.settings.clear(),
      ]);
    },
  );
}
