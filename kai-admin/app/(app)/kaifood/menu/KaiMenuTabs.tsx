"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/kaifood/menu/appearance", label: "Apariencia" },
  { href: "/kaifood/menu/topbar", label: "Topbar" },
  { href: "/kaifood/menu/hero", label: "Hero" },
  { href: "/kaifood/menu/about", label: "Nosotros" },
  { href: "/kaifood/menu/find-us", label: "Encuéntranos" },
] as const;

export function KaiMenuTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-2 border-b border-border pb-3">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-full px-3 py-1 text-sm ${
              active ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
