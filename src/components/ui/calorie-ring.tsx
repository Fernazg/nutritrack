import { formatNumber } from "@/lib/utils";

interface CalorieRingProps {
  consumed: number;
  goal: number;
  size?: number;
}

export function CalorieRing({ consumed, goal, size = 176 }: CalorieRingProps) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const progress = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const remaining = Math.max(goal - consumed, 0);
  const over = consumed > goal;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={over ? "var(--danger)" : "var(--accent)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="tabular text-[34px] leading-none font-bold tracking-tight">
          {formatNumber(over ? consumed - goal : remaining)}
        </span>
        <span className="mt-1.5 text-[13px] font-medium text-muted">
          {over ? "kcal excedidas" : "kcal restantes"}
        </span>
      </div>
    </div>
  );
}
