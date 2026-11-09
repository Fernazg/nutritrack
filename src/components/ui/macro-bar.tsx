import { formatNumber } from "@/lib/utils";

export type MacroKey = "protein" | "carbs" | "fat";

export const MACRO_META: Record<MacroKey, { label: string; color: string }> = {
  protein: { label: "Proteínas", color: "var(--protein)" },
  carbs: { label: "Carbos", color: "var(--carbs)" },
  fat: { label: "Grasas", color: "var(--fat)" },
};

interface MacroBarProps {
  macro: MacroKey;
  value: number;
  goal: number;
}

export function MacroBar({ macro, value, goal }: MacroBarProps) {
  const { label, color } = MACRO_META[macro];
  const pct = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <span className="size-2 shrink-0 rounded-full" style={{ background: color }} />
        <span className="truncate text-[12px] font-medium text-muted">{label}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <p className="tabular mt-2 text-[13px]">
        <span className="font-semibold">{formatNumber(value)}</span>
        <span className="text-muted"> / {formatNumber(goal)} g</span>
      </p>
    </div>
  );
}
