import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  backHref?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, backHref, action }: PageHeaderProps) {
  return (
    <header className="pt-safe">
      <div className="flex min-h-11 items-center justify-between pt-3">
        {backHref ? (
          <Link
            href={backHref}
            className="-ml-2 flex items-center gap-0.5 rounded-full py-2 pr-3 pl-1 text-[15px] font-medium text-accent active:opacity-60"
          >
            <ChevronLeft className="size-5" strokeWidth={2.5} />
            Volver
          </Link>
        ) : (
          <span />
        )}
        {action}
      </div>
      <h1 className="mt-1 text-[30px] leading-tight font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-[15px] text-muted">{subtitle}</p>}
    </header>
  );
}
