"use client";

import { useState } from "react";
import { Dumbbell, Plus, Trash2 } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/card";
import { Sheet, SheetAction } from "@/components/ui/sheet";
import { Field, FieldGroup } from "@/components/ui/field";
import { useExerciseEntries, useWeightEntries } from "@/lib/db/hooks";
import { addExercise, deleteExercise } from "@/lib/db/repository";
import { ACTIVITY_TYPES, activityKcal, getActivityType } from "@/lib/nutrition/activity";
import { parseNumber } from "@/lib/parse";
import { cn, formatNumber } from "@/lib/utils";

const FORM_ID = "exercise-form";

export function ActivitySection({ date }: { date: string | null }) {
  const entries = useExerciseEntries(date);
  const weights = useWeightEntries();
  const weightKg = weights?.at(-1)?.weightKg;
  const [open, setOpen] = useState(false);
  const totalMin = entries?.reduce((s, e) => s + e.minutes, 0) ?? 0;
  const totalKcal = entries?.reduce((s, e) => s + e.kcal, 0) ?? 0;

  return (
    <section>
      <SectionTitle
        action={
          <button
            type="button"
            disabled={!date}
            onClick={() => setOpen(true)}
            className="flex items-center gap-1 text-[14px] font-medium text-accent disabled:opacity-50"
          >
            <Plus className="size-4" strokeWidth={2.5} /> Agregar
          </button>
        }
      >
        Actividad física
      </SectionTitle>
      <Card className="p-0">
        {entries && entries.length > 0 ? (
          <>
            <ul className="divide-y divide-border">
              {entries.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                  <Dumbbell className="size-4.5 shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{e.label}</p>
                    <p className="tabular text-[12px] text-muted">
                      {e.minutes} min · ≈ {formatNumber(e.kcal)} kcal
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Eliminar ${e.label}`}
                    onClick={() => e.id !== undefined && deleteExercise(e.id)}
                    className="flex size-9 items-center justify-center rounded-full text-muted active:bg-surface-2"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
            <p className="tabular border-t border-border px-5 py-2.5 text-[13px] text-muted">
              Total: {totalMin} min · ≈ {formatNumber(totalKcal)} kcal (estimación, no se suma a tu meta)
            </p>
          </>
        ) : (
          <p className="px-5 py-5 text-center text-[14px] text-muted">Sin actividad registrada este día.</p>
        )}
      </Card>
      {open && date && <ExerciseSheet date={date} weightKg={weightKg} onClose={() => setOpen(false)} />}
    </section>
  );
}

function ExerciseSheet({ date, weightKg, onClose }: { date: string; weightKg?: number; onClose: () => void }) {
  const [type, setType] = useState(ACTIVITY_TYPES[0].id);
  const [minutes, setMinutes] = useState("30");
  const [error, setError] = useState<string | null>(null);
  const activity = getActivityType(type)!;
  const min = parseNumber(minutes);
  const kg = weightKg ?? 70;
  const kcal = activityKcal(activity.met, kg, min ?? 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (min === null || min <= 0 || min > 600) {
      setError("Ingresa entre 1 y 600 minutos.");
      return;
    }
    await addExercise({ date, type, label: activity.label, minutes: Math.round(min), kcal });
    onClose();
  }

  return (
    <Sheet title="Actividad" onClose={onClose} action={<SheetAction form={FORM_ID}>Guardar</SheetAction>}>
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-5">
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface" role="radiogroup" aria-label="Tipo de actividad">
          {ACTIVITY_TYPES.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={type === a.id}
              onClick={() => setType(a.id)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left active:bg-surface-2"
            >
              <span className={cn("size-5 shrink-0 rounded-full border-2", type === a.id ? "border-[6px] border-accent" : "border-border")} />
              <span className="flex-1 text-[15px]">{a.label}</span>
            </button>
          ))}
        </div>
        <FieldGroup>
          <Field label="Duración" unit="min" inputMode="numeric" value={minutes}
            onChange={(e) => setMinutes(e.target.value.replace(/\D/g, "").slice(0, 3))} />
        </FieldGroup>
        <p className="px-1 text-[13px] text-muted">
          ≈ <span className="tabular font-semibold text-text">{formatNumber(kcal)} kcal</span> con {formatNumber(kg, 1)} kg
          {weightKg === undefined && " (peso de referencia; registra tu peso para mayor precisión)"}. Estimación
          con valores MET del Compendio de Actividades Físicas.
        </p>
        {error && <p className="px-1 text-[14px] text-danger" role="alert">{error}</p>}
      </form>
    </Sheet>
  );
}
