"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Tabs } from "@kai/ui";

const BASE = "/purchasing/transactions";

const items = [
  { url: `${BASE}/receptions`, label: "Recepciones" },
  { url: `${BASE}/orders`, label: "Órdenes de compra" },
  { url: `${BASE}/purchase-returns`, label: "Devoluciones proveedor" },
  { url: `${BASE}/payments`, label: "Pagos" },
];

function activeTabUrl(pathname: string): string {
  const matches = items.filter(
    (tab) => pathname === tab.url || pathname.startsWith(`${tab.url}/`),
  );
  if (matches.length === 0) {
    return `${BASE}/receptions`;
  }
  return [...matches].sort((a, b) => b.url.length - a.url.length)[0]!.url;
}

export function PurchasingTransactionsTabs() {
  const pathname = usePathname();
  const activeTab = useMemo(() => activeTabUrl(pathname), [pathname]);
  return <Tabs items={items} activeTab={activeTab} />;
}
