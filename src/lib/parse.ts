/**
 * Parses user-typed numbers, accepting a comma as decimal separator
 * (Spanish iOS keyboards). Returns null for empty or invalid input.
 */
export function parseNumber(raw: string): number | null {
  const s = raw.trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Rounds to one decimal, the precision we store macros and weight at. */
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Atwater estimate: 4 kcal/g protein & carbs, 9 kcal/g fat. */
export function kcalFromMacros(protein: number, carbs: number, fat: number): number {
  return Math.round(protein * 4 + carbs * 4 + fat * 9);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isISODate(s: string | null | undefined): s is string {
  return !!s && ISO_DATE.test(s);
}

/** Formats a number for an input field (comma decimals, no trailing zeros). */
export function toInputValue(n: number | undefined | null): string {
  if (n === undefined || n === null) return "";
  return String(round1(n)).replace(".", ",");
}
