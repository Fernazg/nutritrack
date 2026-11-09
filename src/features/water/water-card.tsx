"use client";

import { Droplet, Minus, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useWaterEntries } from "@/lib/db/hooks";
import { addWater, undoLastWater } from "@/lib/db/repository";
import { formatLiters } from "@/lib/utils";

const GLASS_ML = 250;

export function WaterCard({ date, goalMl }: { date: string | null; goalMl: number }) {
  const entries = useWaterEntries(date);
  const total = entries?.reduce((s, e) => s + e.ml, 0) ?? 0;
  const pct = goalMl > 0 ? Math.min(total / goalMl, 1) : 0;
  const glasses = Math.max(Math.round(goalMl / GLASS_ML), 1);
  const filled = Math.floor(total / GLASS_ML);

  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-protein/12 text-protein">
          <Droplet className="size-5" />
        </div>
        <div className="flex-1">
          <p className="text-[13px] text-muted">Agua</p>
          <p className="tabular text-[17px] font-semibold">
            {formatLiters(total)} L
            <span className="text-[13px] font-medium text-muted"> / {formatLiters(goalMl)} L</span>
          </p>
        </div>
        <button
          type="button"
          aria-label="Quitar último registro de agua"
          disabled={!date || total === 0}
          onClick={() => date && undoLastWater(date)}
          className="flex size-10 items-center justify-center rounded-full bg-surface-2 text-text active:scale-95 disabled:opacity-30"
        >
          <Minus className="size-4" strokeWidth={2.5} />
        </button>
        <button
          type="button"
          aria-label={`Agregar ${GLASS_ML} ml de agua`}
          disabled={!date}
          onClick={() => date && addWater(date, GLASS_ML)}
          className="flex h-10 items-center gap-1 rounded-full bg-protein px-3.5 text-[14px] font-semibold text-white active:scale-95 disabled:opacity-50"
        >
          <Plus className="size-4" strokeWidth={2.5} /> 250 ml
        </button>
      </div>
      <div
        className="mt-4 flex gap-1"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={goalMl}
        aria-valuenow={total}
        aria-label="Progreso de agua"
      >
        {glasses <= 16 ? (
          Array.from({ length: glasses }, (_, i) => (
            <span
              key={i}
              className="h-2 flex-1 rounded-full transition-colors duration-300"
              style={{ background: i < filled ? "var(--protein)" : "var(--surface-2)" }}
            />
          ))
        ) : (
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
            <span className="block h-full rounded-full bg-protein transition-[width]" style={{ width: `${pct * 100}%` }} />
          </span>
        )}
      </div>
    </Card>
  );
}
