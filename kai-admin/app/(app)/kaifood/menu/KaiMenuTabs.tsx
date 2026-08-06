"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Tabs } from "@kai/ui";

const BASE = "/kaifood/menu";

const items = [
  { url: `${BASE}/appearance`, label: "Apariencia" },
  { url: `${BASE}/topbar`, label: "Topbar" },
  { url: `${BASE}/hero`, label: "Hero" },
  { url: `${BASE}/about`, label: "Nosotros" },
  { url: `${BASE}/find-us`, label: "Encuéntranos" },
] as const;

function activeTabUrl(pathname: string): string {
  const matches = items.filter(
    (tab) => pathname === tab.url || pathname.startsWith(`${tab.url}/`),
  );
  if (matches.length === 0) {
    return `${BASE}/appearance`;
  }
  return [...matches].sort((a, b) => b.url.length - a.url.length)[0]!.url;
}

export function KaiMenuTabs() {
  const pathname = usePathname();
  const activeTab = useMemo(() => activeTabUrl(pathname), [pathname]);

  return (
    <div className="w-fit max-w-full shrink-0 border-b border-border">
      <Tabs items={[...items]} activeTab={activeTab} />
    </div>
  );
}
