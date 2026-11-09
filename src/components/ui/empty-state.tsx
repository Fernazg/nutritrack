import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-6 py-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-surface-2 text-muted">
        <Icon className="size-6" />
      </div>
      <p className="mt-3 text-[15px] font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-64 text-[13px] text-muted">{description}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
