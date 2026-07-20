"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Tabs } from "@kai/ui";

const BASE = "/treasury/operating-expenses";

const items = [
  { url: `${BASE}/expenses`, label: "Gastos operativos" },
  { url: `${BASE}/categories`, label: "Categorías" },
  { url: `${BASE}/recurring`, label: "Recurrentes" },
];

function activeTabUrl(pathname: string): string {
  const matches = items.filter(
    (tab) => pathname === tab.url || pathname.startsWith(`${tab.url}/`),
  );
  if (matches.length === 0) {
    return `${BASE}/expenses`;
  }
  return [...matches].sort((a, b) => b.url.length - a.url.length)[0]!.url;
}

export function OperatingExpensesTabs() {
  const pathname = usePathname();
  const activeTab = useMemo(() => activeTabUrl(pathname), [pathname]);
  return <Tabs items={items} activeTab={activeTab} />;
}
