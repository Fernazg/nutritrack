import { getDB } from "./database";
import type { FoodEntry, Goals, SettingRecord, WeightEntry } from "@/types/nutrition";

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

// ---- Food ---------------------------------------------------------------

export async function addFoodEntry(input: FoodEntryInput): Promise<number> {
  void requestPersistence();
  const id = await getDB().foodEntries.add({ ...input, createdAt: Date.now() });
  return id as number;
}

export async function updateFoodEntry(id: number, changes: Partial<FoodEntryInput>) {
  await getDB().foodEntries.update(id, changes);
}

export async function deleteFoodEntry(id: number) {
  await getDB().foodEntries.delete(id);
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

// ---- Data management ----------------------------------------------------

export interface ExportFile {
  app: "nutritrack";
  version: 1;
  exportedAt: string;
  foodEntries: FoodEntry[];
  weightEntries: WeightEntry[];
  settings: SettingRecord[];
}

export async function exportAll(): Promise<ExportFile> {
  const db = getDB();
  const [foodEntries, weightEntries, settings] = await Promise.all([
    db.foodEntries.toArray(),
    db.weightEntries.toArray(),
    db.settings.toArray(),
  ]);
  return {
    app: "nutritrack",
    version: 1,
    exportedAt: new Date().toISOString(),
    foodEntries,
    weightEntries,
    settings,
  };
}

export async function clearAll() {
  const db = getDB();
  await db.transaction("rw", db.foodEntries, db.weightEntries, db.settings, async () => {
    await Promise.all([db.foodEntries.clear(), db.weightEntries.clear(), db.settings.clear()]);
  });
}
