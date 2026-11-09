import { Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SoonBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import type { ScanModeConfig } from "./scan-modes";

/**
 * Visual shell for a capture flow. Camera access and analysis are wired in a
 * later phase; for now the viewfinder and controls are presentational only.
 */
export function ScanScreen({ config }: { config: ScanModeConfig }) {
  const Icon = config.icon;
  const isBarcode = config.mode === "codigo";

  return (
    <div className="space-y-5">
      <PageHeader
        title={config.title}
        subtitle={config.description}
        backHref="/escanear"
        action={<SoonBadge />}
      />

      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-neutral-900">
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-800 to-neutral-950" />
        <div
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-white/80",
            isBarcode ? "h-28 w-[78%]" : "aspect-square w-[78%]",
          )}
        >
          {isBarcode && (
            <div className="absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_12px_var(--accent)]" />
          )}
        </div>
        <div className="absolute inset-x-0 bottom-5 flex flex-col items-center gap-2 text-white/70">
          <Icon className="size-5" />
          <p className="text-[13px]">La cámara estará disponible pronto</p>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          disabled
          aria-label="Capturar"
          className="flex size-18 items-center justify-center rounded-full border-4 border-border bg-surface disabled:opacity-60"
        >
          <span className="size-13 rounded-full bg-accent" />
        </button>
      </div>

      <Card>
        <div className="mb-3 flex items-center gap-2">
          <Lightbulb className="size-4 text-carbs" />
          <p className="text-[14px] font-semibold">Consejos</p>
        </div>
        <ul className="space-y-2 text-[14px] text-muted">
          {config.tips.map((tip) => (
            <li key={tip} className="flex gap-2">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-muted" />
              {tip}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
