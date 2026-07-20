"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Tabs } from "@kai/ui";
import {
  SII,
  SII_CERTIFICACION,
  SII_CONTRIBUYENTE,
  SII_CREDENCIALES,
  SII_DOCUMENTOS,
  SII_FOLIOS,
  SII_PRODUCCION,
} from "@/navigation/sii-routes";

const items = [
  { label: "Resumen", url: SII },
  { label: "Contribuyente", url: SII_CONTRIBUYENTE },
  { label: "Documentos", url: SII_DOCUMENTOS },
  { label: "Credenciales", url: SII_CREDENCIALES },
  { label: "Certificación", url: SII_CERTIFICACION },
  { label: "Folios", url: SII_FOLIOS },
  { label: "Producción", url: SII_PRODUCCION },
];

function activeTabUrl(pathname: string): string {
  const normalized = pathname.replace(/\/$/, "") || "/";
  const matches = items.filter(
    (tab) => normalized === tab.url || normalized.startsWith(`${tab.url}/`),
  );
  if (matches.length === 0) {
    return SII;
  }
  return [...matches].sort((a, b) => b.url.length - a.url.length)[0]!.url;
}

export function SiiNav() {
  const pathname = usePathname();
  const activeTab = useMemo(() => activeTabUrl(pathname), [pathname]);
  return <Tabs items={items} activeTab={activeTab} />;
}
