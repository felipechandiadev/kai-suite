"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Tabs } from "@kai/ui";

const BASE = "/e-shop/fulfillment";

const items = [
  { url: BASE, label: "Pedidos web" },
  { url: `${BASE}/metodos`, label: "Métodos" },
];

function activeTabUrl(pathname: string): string {
  const matches = items.filter((tab) => {
    if (tab.url === BASE) {
      return pathname === BASE || pathname === `${BASE}/`;
    }
    return pathname === tab.url || pathname.startsWith(`${tab.url}/`);
  });
  if (matches.length === 0) return BASE;
  return [...matches].sort((a, b) => b.url.length - a.url.length)[0]!.url;
}

export function FulfillmentTabs() {
  const pathname = usePathname();
  const activeTab = useMemo(() => activeTabUrl(pathname), [pathname]);

  return (
    <div className="w-fit max-w-full shrink-0 border-b border-border">
      <Tabs items={items} activeTab={activeTab} />
    </div>
  );
}
