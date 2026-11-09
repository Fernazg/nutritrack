"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, House, ScanLine, Settings, TrendingUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const LEFT: NavItem[] = [
  { href: "/", label: "Inicio", icon: House },
  { href: "/diario", label: "Diario", icon: BookOpen },
];

const RIGHT: NavItem[] = [
  { href: "/progreso", label: "Progreso", icon: TrendingUp },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function Tab({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 pt-2 pb-1 text-[10.5px] font-medium transition-colors active:opacity-60",
        active ? "text-accent" : "text-muted",
      )}
    >
      <Icon className="size-6" strokeWidth={active ? 2.3 : 1.8} />
      {item.label}
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const scanActive = isActive(pathname, "/escanear");

  return (
    <nav
      aria-label="Navegación principal"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/85 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-lg items-start px-2">
        {LEFT.map((item) => (
          <Tab key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
        <div className="flex flex-1 justify-center">
          <Link
            href="/escanear"
            aria-label="Escanear"
            aria-current={scanActive ? "page" : undefined}
            className={cn(
              "-mt-5 flex size-14 items-center justify-center rounded-full text-on-accent shadow-lg shadow-accent/30 transition-transform active:scale-95",
              scanActive ? "bg-accent-strong" : "bg-accent",
            )}
          >
            <ScanLine className="size-6" strokeWidth={2.2} />
          </Link>
        </div>
        {RIGHT.map((item) => (
          <Tab key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
      </div>
    </nav>
  );
}
