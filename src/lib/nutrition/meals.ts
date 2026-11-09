import { Coffee, Moon, Sun, Sunset, type LucideIcon } from "lucide-react";
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
] as const;

export function getMeal(type: string): MealConfig | undefined {
  return MEALS.find((m) => m.type === type);
}
