import Dexie, { type EntityTable } from "dexie";
import type { FoodEntry, SettingRecord, WeightEntry } from "@/types/nutrition";

/**
 * Local-only persistence (IndexedDB via Dexie). No accounts, no server sync.
 * Bump the version and add a new `stores()` block when the schema changes.
 */
export class NutriTrackDB extends Dexie {
  foodEntries!: EntityTable<FoodEntry, "id">;
  weightEntries!: EntityTable<WeightEntry, "id">;
  settings!: EntityTable<SettingRecord, "key">;

  constructor() {
    super("nutritrack");
    this.version(1).stores({
      foodEntries: "++id, date, meal, [date+meal], createdAt",
      weightEntries: "++id, date, createdAt",
      settings: "&key",
    });
  }
}

let instance: NutriTrackDB | null = null;

/** Lazily created so nothing touches IndexedDB during server prerendering. */
export function getDB(): NutriTrackDB {
  instance ??= new NutriTrackDB();
  return instance;
}
