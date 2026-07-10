"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Tabs } from "@kai/ui";

const BASE = "/catalog";

const items = [
  { url: `${BASE}/products`, label: "Productos" },
  { url: `${BASE}/categories`, label: "Categorías" },
  { url: `${BASE}/brands`, label: "Marcas" },
  { url: `${BASE}/attributes`, label: "Atributos" },
];

function activeTabUrl(pathname: string): string {
  const matches = items.filter(
    (tab) => pathname === tab.url || pathname.startsWith(`${tab.url}/`),
  );
  if (matches.length === 0) {
    return `${BASE}/products`;
  }
  return [...matches].sort((a, b) => b.url.length - a.url.length)[0]!.url;
}

export function CatalogTabs() {
  const pathname = usePathname();
  const activeTab = useMemo(() => activeTabUrl(pathname), [pathname]);
  return <Tabs items={items} activeTab={activeTab} />;
}
