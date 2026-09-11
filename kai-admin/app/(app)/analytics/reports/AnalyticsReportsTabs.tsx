"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Tabs } from "@kai/ui";

const BASE = "/analytics/reports";

const items = [
  { url: `${BASE}/sales`, label: "Ventas" },
  { url: `${BASE}/purchasing`, label: "Compras" },
  { url: `${BASE}/inventory`, label: "Inventario" },
];

function activeTabUrl(pathname: string): string {
  const matches = items.filter(
    (tab) => pathname === tab.url || pathname.startsWith(`${tab.url}/`),
  );
  if (matches.length === 0) {
    return `${BASE}/sales`;
  }
  return [...matches].sort((a, b) => b.url.length - a.url.length)[0]!.url;
}

export function AnalyticsReportsTabs() {
  const pathname = usePathname();
  const activeTab = useMemo(() => activeTabUrl(pathname ?? ""), [pathname]);
  return <Tabs items={items} activeTab={activeTab} />;
}
