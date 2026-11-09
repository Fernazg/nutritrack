import Link from "next/link";
import { SCAN_MODES } from "./scan-modes";

export function QuickActions() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {SCAN_MODES.map(({ mode, short, icon: Icon }) => (
        <Link
          key={mode}
          href={`/escanear/${mode}`}
          className="flex flex-col items-center gap-2 rounded-3xl border border-border bg-surface px-2 py-4 active:scale-[0.97] active:bg-surface-2 transition-transform"
        >
          <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <Icon className="size-5" />
          </div>
          <span className="text-[13px] font-medium">{short}</span>
        </Link>
      ))}
    </div>
  );
}
