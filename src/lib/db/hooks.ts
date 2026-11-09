"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDB } from "./database";
import { DEFAULT_GOALS } from "@/lib/nutrition/goals";
import type { FoodEntry, Goals, WeightEntry } from "@/types/nutrition";

export function useFoodEntries(date: string | null): FoodEntry[] | undefined {
  return useLiveQuery(
    () => (date ? getDB().foodEntries.where("date").equals(date).sortBy("createdAt") : []),
    [date],
  );
}

export function useWeightEntries(): WeightEntry[] | undefined {
  return useLiveQuery(() => getDB().weightEntries.orderBy("date").toArray(), []);
}

export function useGoals(): Goals {
  const record = useLiveQuery(() => getDB().settings.get("goals"), []);
  return { ...DEFAULT_GOALS, ...(record?.value as Partial<Goals> | undefined) };
}
