"use client";

import { useState } from "react";
import { Sheet, SheetAction } from "@/components/ui/sheet";
import { DangerButton, Field, FieldGroup } from "@/components/ui/field";
import { deleteWeight, saveWeight } from "@/lib/db/repository";
import { formatLongDate } from "@/lib/date";
import { parseNumber, round1, toInputValue } from "@/lib/parse";
import type { WeightEntry } from "@/types/nutrition";

interface WeightSheetProps {
  today: string;
  /** Prefill for a new entry (last known weight). */
  lastWeightKg?: number;
  entry?: WeightEntry;
  onClose: () => void;
}

const FORM_ID = "weight-form";

export function WeightSheet({ today, lastWeightKg, entry, onClose }: WeightSheetProps) {
  const [date, setDate] = useState(entry?.date ?? today);
  const [weight, setWeight] = useState(toInputValue(entry?.weightKg ?? lastWeightKg));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kg = parseNumber(weight);
  const valid = kg !== null && kg >= 20 && kg <= 400 && date !== "" && date <= today;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || saving || kg === null) return;
    setSaving(true);
    try {
      await saveWeight(date, round1(kg));
      onClose();
    } catch {
      setError("No se pudo guardar. Inténtalo de nuevo.");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (entry?.id === undefined) return;
    setSaving(true);
    try {
      await deleteWeight(entry.id);
      onClose();
    } catch {
      setError("No se pudo eliminar.");
      setSaving(false);
    }
  }

  return (
    <Sheet
      title={entry ? "Editar peso" : "Registrar peso"}
      onClose={onClose}
      action={
        <SheetAction form={FORM_ID} disabled={!valid || saving}>
          Guardar
        </SheetAction>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-5">
        <FieldGroup>
          <Field
            label="Peso"
            unit="kg"
            inputMode="decimal"
            placeholder="0,0"
            value={weight}
            onChange={(e) => setWeight(e.target.value.replace(/[^\d.,]/g, ""))}
            autoFocus
            autoComplete="off"
          />
          {entry ? (
            <div className="flex min-h-12 items-center justify-between px-4">
              <span className="text-[16px]">Fecha</span>
              <span className="text-[16px] text-muted">{formatLongDate(entry.date)}</span>
            </div>
          ) : (
            <Field
              label="Fecha"
              type="date"
              max={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          )}
        </FieldGroup>
        <p className="px-4 text-[13px] text-muted">
          Se guarda un registro por día. Si ya existe uno para esa fecha, se reemplaza.
        </p>

        {error && <p className="px-4 text-[14px] text-danger">{error}</p>}

        {entry && (
          <DangerButton onClick={handleDelete} disabled={saving}>
            Eliminar registro
          </DangerButton>
        )}
      </form>
    </Sheet>
  );
}
