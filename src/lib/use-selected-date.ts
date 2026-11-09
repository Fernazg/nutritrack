"use client";

import { useSearchParams } from "next/navigation";
import { useToday } from "./date";
import { isISODate } from "./parse";

/**
 * The day being viewed/edited, taken from `?fecha=YYYY-MM-DD` and falling
 * back to today. Future dates are clamped to today.
 * Components using this must sit under a <Suspense> boundary.
 */
export function useSelectedDate(): { date: string | null; today: string | null; isToday: boolean } {
  const today = useToday();
  const param = useSearchParams().get("fecha");
  const date = today && isISODate(param) && param < today ? param : today;
  return { date, today, isToday: date !== null && date === today };
}

/** Appends ?fecha= only when the date isn't today, keeping URLs clean. */
export function withDate(path: string, date: string | null, today: string | null): string {
  return date && date !== today ? `${path}?fecha=${date}` : path;
}
