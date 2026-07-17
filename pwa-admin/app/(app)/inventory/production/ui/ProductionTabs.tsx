"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Tabs } from "@kai/ui";

const BASE = "/inventory/production";

const items = [
  { url: `${BASE}/orders`, label: "Órdenes de producción" },
  { url: `${BASE}/units`, label: "Unidades de producción" },
];

function activeTabUrl(pathname: string): string {
  const matches = items.filter(
    (tab) => pathname === tab.url || pathname.startsWith(`${tab.url}/`),
  );
  if (matches.length === 0) {
    return `${BASE}/orders`;
  }
  return [...matches].sort((a, b) => b.url.length - a.url.length)[0]!.url;
}

export function ProductionTabs() {
  const pathname = usePathname();
  const activeTab = useMemo(() => activeTabUrl(pathname), [pathname]);
  return <Tabs items={items} activeTab={activeTab} />;
}
