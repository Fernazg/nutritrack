export { clsx as cn } from "clsx";

export function formatNumber(n: number, digits = 0): string {
  return n.toLocaleString("es-CL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** 500 → "0,5", 2750 → "2,75", 2000 → "2" (liters, up to 2 decimals). */
export function formatLiters(ml: number): string {
  return (ml / 1000).toLocaleString("es-CL", { maximumFractionDigits: 2 });
}
