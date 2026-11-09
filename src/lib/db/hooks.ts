"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDB } from "./database";
import { DEFAULT_GOALS } from "@/lib/nutrition/goals";
import type { FoodEntry, FoodItem, Goals, Profile, WaterEntry, WeightEntry } from "@/types/nutrition";

export function useFoodEntries(date: string | null): FoodEntry[] | undefined {
  return useLiveQuery(
    () => (date ? getDB().foodEntries.where("date").equals(date).sortBy("createdAt") : []),
    [date],
  );
}

/** Entries between two dates (inclusive), for statistics. */
export function useFoodEntriesRange(from: string | null, to: string | null): FoodEntry[] | undefined {
  return useLiveQuery(
    () =>
      from && to ? getDB().foodEntries.where("date").between(from, to, true, true).toArray() : [],
    [from, to],
  );
}

export function useWeightEntries(): WeightEntry[] | undefined {
  return useLiveQuery(() => getDB().weightEntries.orderBy("date").toArray(), []);
}

export function useWaterEntries(date: string | null): WaterEntry[] | undefined {
  return useLiveQuery(
    () => (date ? getDB().waterEntries.where("date").equals(date).toArray() : []),
    [date],
  );
}

/** Saved foods, most recently used first. */
export function useSavedFoods(): FoodItem[] | undefined {
  return useLiveQuery(() => getDB().foods.orderBy("lastUsed").reverse().limit(200).toArray(), []);
}

export function useGoals(): Goals {
  const record = useLiveQuery(() => getDB().settings.get("goals"), []);
  return { ...DEFAULT_GOALS, ...(record?.value as Partial<Goals> | undefined) };
}

/** undefined while loading, null when not configured yet. */
export function useProfile(): Profile | null | undefined {
  return useLiveQuery(
    async () => ((await getDB().settings.get("profile"))?.value as Profile | undefined) ?? null,
    [],
  );
}
