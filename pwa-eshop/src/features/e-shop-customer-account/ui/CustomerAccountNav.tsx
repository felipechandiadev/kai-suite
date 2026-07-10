"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Tabs } from "@kai/ui";

const items = [
  { url: "/cuenta", label: "Resumen" },
  { url: "/cuenta/pedidos", label: "Pedidos" },
  { url: "/cuenta/pagos", label: "Pagos" },
  { url: "/cuenta/deudas", label: "Deudas" },
  { url: "/cuenta/perfil", label: "Perfil" },
];

function activeTabUrl(pathname: string): string {
  const matches = items.filter(
    (tab) => pathname === tab.url || pathname.startsWith(`${tab.url}/`),
  );
  if (matches.length === 0) {
    return "/cuenta";
  }
  return [...matches].sort((a, b) => b.url.length - a.url.length)[0]!.url;
}

export function CustomerAccountNav() {
  const pathname = usePathname();
  const activeTab = useMemo(() => activeTabUrl(pathname), [pathname]);
  return <Tabs items={items} activeTab={activeTab} />;
}
