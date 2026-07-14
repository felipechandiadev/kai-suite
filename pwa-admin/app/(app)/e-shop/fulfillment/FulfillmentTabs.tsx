"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Tabs } from "@kai/ui";

const BASE = "/e-shop/fulfillment";

const items = [
  { url: BASE, label: "Pedidos web" },
  { url: `${BASE}/metodos`, label: "Métodos" },
  { url: `${BASE}/cobertura`, label: "Cobertura" },
  { url: `${BASE}/zonas`, label: "Zonas" },
  { url: `${BASE}/calendario`, label: "Calendario" },
  { url: `${BASE}/operacion`, label: "Operación" },
  { url: `${BASE}/reparto`, label: "Reparto" },
  { url: `${BASE}/configuracion`, label: "Configuración" },
];

function activeTabUrl(pathname: string): string {
  // Match longest path first so BASE does not stay active for sub-routes.
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
