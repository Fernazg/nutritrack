import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-3xl border border-border bg-surface p-5", className)}
      {...props}
    />
  );
}

export function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between px-1">
      <h2 className="text-[15px] font-semibold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}
