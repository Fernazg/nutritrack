import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SCAN_MODES } from "./scan-modes";

export function ScannerHub() {
  return (
    <div className="space-y-6">
      <PageHeader title="Escanear" subtitle="Elige cómo quieres registrar o analizar." />
      <ul className="space-y-3">
        {SCAN_MODES.map(({ mode, title, description, icon: Icon }) => (
          <li key={mode}>
            <Link
              href={`/escanear/${mode}`}
              className="flex items-center gap-4 rounded-3xl border border-border bg-surface p-5 active:bg-surface-2"
            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <Icon className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-semibold">{title}</p>
                <p className="mt-0.5 text-[13px] text-muted">{description}</p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
