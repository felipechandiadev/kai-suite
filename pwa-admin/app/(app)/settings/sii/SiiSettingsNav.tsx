"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import Tabs from "@/shared/components/Tabs";

const items = [
  { label: "General", url: "/settings/sii" },
  { label: "Certificación", url: "/settings/sii/certificacion" },
  { label: "Impresión de prueba", url: "/settings/sii/impresion-prueba" },
  { label: "Emisor", url: "/settings/sii/emisor" },
  { label: "Credenciales", url: "/settings/sii/credenciales" },
  { label: "Folios", url: "/settings/sii/folios" },
  { label: "Producción", url: "/settings/sii/produccion" },
];

function activeTabUrl(pathname: string): string {
  const normalized = pathname.replace(/\/$/, "") || "/";
  const matches = items.filter(
    (tab) => normalized === tab.url || normalized.startsWith(`${tab.url}/`),
  );
  if (matches.length === 0) {
    return "/settings/sii";
  }
  return [...matches].sort((a, b) => b.url.length - a.url.length)[0]!.url;
}

export function SiiSettingsNav() {
  const pathname = usePathname();
  const activeTab = useMemo(() => activeTabUrl(pathname), [pathname]);
  return <Tabs items={items} activeTab={activeTab} />;
}
