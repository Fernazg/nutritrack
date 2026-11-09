"use client";

import { useSyncExternalStore } from "react";

/** Local calendar day as YYYY-MM-DD (not UTC). */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

const noopSubscribe = () => () => {};

/**
 * Today's date, read only on the client. Returns null during prerender so
 * the static shell never bakes in the build-time date.
 */
export function useToday(): string | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => toISODate(new Date()),
    () => null,
  );
}

const longFmt = new Intl.DateTimeFormat("es-CL", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function formatLongDate(iso: string): string {
  const s = longFmt.format(fromISODate(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function greeting(hour: number): string {
  if (hour < 12) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}
