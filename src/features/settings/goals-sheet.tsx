"use client";

import { useState } from "react";
import { Sheet, SheetAction } from "@/components/ui/sheet";
import { Field, FieldGroup } from "@/components/ui/field";
import { MACRO_META } from "@/components/ui/macro-bar";
import { saveGoals } from "@/lib/db/repository";
import { kcalFromMacros, parseNumber, round1, toInputValue } from "@/lib/parse";
import { cn, formatNumber } from "@/lib/utils";
import type { Goals } from "@/types/nutrition";

const FORM_ID = "goals-form";
const clean = (v: string) => v.replace(/[^\d.,]/g, "");

export function GoalsSheet({ goals, onClose }: { goals: Goals; onClose: () => void }) {
  const [calories, setCalories] = useState(toInputValue(goals.calories));
  const [protein, setProtein] = useState(toInputValue(goals.protein));
  const [carbs, setCarbs] = useState(toInputValue(goals.carbs));
  const [fat, setFat] = useState(toInputValue(goals.fat));
  const [target, setTarget] = useState(toInputValue(goals.targetWeightKg));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kcal = parseNumber(calories);
  const p = parseNumber(protein);
  const c = parseNumber(carbs);
  const f = parseNumber(fat);
  const t = parseNumber(target);

  const valid =
    kcal !== null && kcal >= 500 && kcal <= 10000 &&
    p !== null && p >= 0 && c !== null && c >= 0 && f !== null && f >= 0 &&
    (target.trim() === "" || (t !== null && t >= 20 && t <= 400));

  const macroKcal = kcalFromMacros(p ?? 0, c ?? 0, f ?? 0);
  const diff = kcal !== null ? macroKcal - kcal : 0;
  const mismatch = kcal !== null && Math.abs(diff) > kcal * 0.05;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || saving || kcal === null || p === null || c === null || f === null) return;
    setSaving(true);
    try {
      await saveGoals({
        calories: Math.round(kcal),
        protein: round1(p),
        carbs: round1(c),
        fat: round1(f),
        targetWeightKg: t !== null && target.trim() !== "" ? round1(t) : undefined,
      });
      onClose();
    } catch {
      setError("No se pudo guardar. Inténtalo de nuevo.");
      setSaving(false);
    }
  }

  return (
    <Sheet
      title="Metas diarias"
      onClose={onClose}
      action={
        <SheetAction form={FORM_ID} disabled={!valid || saving}>
          Guardar
        </SheetAction>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-5">
        <div>
          <FieldGroup>
            <Field label="Calorías" unit="kcal" inputMode="numeric" value={calories}
              onChange={(e) => setCalories(clean(e.target.value))} />
            <Field label="Proteínas" unit="g" dot={MACRO_META.protein.color} inputMode="decimal"
              value={protein} onChange={(e) => setProtein(clean(e.target.value))} />
            <Field label="Carbohidratos" unit="g" dot={MACRO_META.carbs.color} inputMode="decimal"
              value={carbs} onChange={(e) => setCarbs(clean(e.target.value))} />
            <Field label="Grasas" unit="g" dot={MACRO_META.fat.color} inputMode="decimal"
              value={fat} onChange={(e) => setFat(clean(e.target.value))} />
          </FieldGroup>
          <p className={cn("mt-2 px-4 text-[13px]", mismatch ? "text-carbs" : "text-muted")}>
            Tus macros suman {formatNumber(macroKcal)} kcal
            {mismatch && ` (${diff > 0 ? "+" : ""}${formatNumber(diff)} respecto a tu meta)`}.
          </p>
        </div>

        <div>
          <FieldGroup>
            <Field label="Peso objetivo" unit="kg" inputMode="decimal" placeholder="Opcional"
              value={target} onChange={(e) => setTarget(clean(e.target.value))} />
          </FieldGroup>
        </div>

        {error && <p className="px-4 text-[14px] text-danger">{error}</p>}
      </form>
    </Sheet>
  );
}
