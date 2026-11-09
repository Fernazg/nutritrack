/**
 * Physical activity energy estimates.
 * kcal ≈ MET × body weight (kg) × duration (h)  (gross energy expenditure).
 * MET values from the Compendium of Physical Activities (Ainsworth et al.,
 * 2011; https://pacompendium.com). Individual expenditure varies.
 */

export interface ActivityType {
  id: string;
  label: string;
  met: number;
}

export const ACTIVITY_TYPES: readonly ActivityType[] = [
  { id: "walk", label: "Caminar (~5 km/h)", met: 3.5 },
  { id: "walk_fast", label: "Caminar rápido (~6,4 km/h)", met: 5.0 },
  { id: "run_8", label: "Correr (~8 km/h)", met: 8.3 },
  { id: "run_10", label: "Correr (~10 km/h)", met: 9.8 },
  { id: "bike", label: "Bicicleta moderada (19–22 km/h)", met: 8.0 },
  { id: "strength", label: "Pesas / fuerza (intenso)", met: 6.0 },
  { id: "strength_light", label: "Pesas / fuerza (moderado)", met: 3.5 },
  { id: "swim", label: "Natación (crol moderado)", met: 5.8 },
  { id: "yoga", label: "Yoga", met: 2.5 },
  { id: "soccer", label: "Fútbol recreativo", met: 7.0 },
] as const;

export function getActivityType(id: string): ActivityType | undefined {
  return ACTIVITY_TYPES.find((a) => a.id === id);
}

export function activityKcal(met: number, weightKg: number, minutes: number): number {
  if (!(met > 0 && weightKg > 0 && minutes > 0)) return 0;
  return Math.round(met * weightKg * (minutes / 60));
}
