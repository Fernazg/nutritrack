import Dexie, { type EntityTable } from "dexie";
import type {
  FoodEntry,
  FoodItem,
  SettingRecord,
  WaterEntry,
  WeightEntry,
} from "@/types/nutrition";

/**
 * Local-only persistence (IndexedDB via Dexie). No accounts, no server sync.
 * Never edit an existing version block: add a new one when the schema changes.
 */
export class NutriTrackDB extends Dexie {
  foodEntries!: EntityTable<FoodEntry, "id">;
  weightEntries!: EntityTable<WeightEntry, "id">;
  settings!: EntityTable<SettingRecord, "key">;
  foods!: EntityTable<FoodItem, "key">;
  waterEntries!: EntityTable<WaterEntry, "id">;

  constructor() {
    super("nutritrack");
    this.version(1).stores({
      foodEntries: "++id, date, meal, [date+meal], createdAt",
      weightEntries: "++id, date, createdAt",
      settings: "&key",
    });
    // v2: saved foods (recents/favorites) and water intake.
    this.version(2).stores({
      foodEntries: "++id, date, meal, [date+meal], createdAt, foodKey",
      foods: "&key, lastUsed, favorite, barcode",
      waterEntries: "++id, date",
    });
  }
}

let instance: NutriTrackDB | null = null;

/** Lazily created so nothing touches IndexedDB during server prerendering. */
export function getDB(): NutriTrackDB {
  instance ??= new NutriTrackDB();
  return instance;
}
