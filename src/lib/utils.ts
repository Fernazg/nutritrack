export { clsx as cn } from "clsx";

export function formatNumber(n: number, digits = 0): string {
  return n.toLocaleString("es-CL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
