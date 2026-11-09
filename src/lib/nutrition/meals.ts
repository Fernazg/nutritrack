import { Apple, Coffee, Moon, Sun, Sunset, type LucideIcon } from "lucide-react";
import type { MealType } from "@/types/nutrition";

export interface MealConfig {
  type: MealType;
  label: string;
  hint: string;
  icon: LucideIcon;
}

export const MEALS: readonly MealConfig[] = [
  { type: "desayuno", label: "Desayuno", hint: "Comienza tu día", icon: Coffee },
  { type: "almuerzo", label: "Almuerzo", hint: "Comida principal", icon: Sun },
  { type: "once", label: "Once", hint: "Media tarde", icon: Sunset },
  { type: "cena", label: "Cena", hint: "Cierra el día", icon: Moon },
  { type: "colacion", label: "Colación", hint: "Snacks entre comidas", icon: Apple },
] as const;

export function getMeal(type: string): MealConfig | undefined {
  return MEALS.find((m) => m.type === type);
}

/** Suggested meal for the current hour (Chilean schedule). */
export function mealForHour(hour: number): MealConfig["type"] {
  if (hour >= 5 && hour < 11) return "desayuno";
  if (hour >= 11 && hour < 16) return "almuerzo";
  if (hour >= 16 && hour < 20) return "once";
  if (hour >= 20 || hour < 2) return "cena";
  return "colacion";
}
