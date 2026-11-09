import { cn } from "@/lib/utils";

export function SoonBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-muted uppercase",
        className,
      )}
    >
      Pronto
    </span>
  );
}
