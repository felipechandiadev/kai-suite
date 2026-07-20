"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Tabs } from "@kai/ui";
import {
  SETTINGS_HCM,
  SETTINGS_HCM_AFP,
  SETTINGS_HCM_CONTRACTS,
  SETTINGS_HCM_JOB_POSITIONS,
  SETTINGS_HCM_JORNADA,
  SETTINGS_HCM_ORG_UNITS,
} from "@/navigation/hcm-routes";

const items = [
  { label: "Jornada", url: SETTINGS_HCM_JORNADA },
  { label: "Contratos", url: SETTINGS_HCM_CONTRACTS },
  { label: "Cargos", url: SETTINGS_HCM_JOB_POSITIONS },
  { label: "AFP", url: SETTINGS_HCM_AFP },
  { label: "Unidades", url: SETTINGS_HCM_ORG_UNITS },
];

function activeTabUrl(pathname: string): string {
  const normalized = pathname.replace(/\/$/, "") || "/";
  if (normalized === SETTINGS_HCM) return SETTINGS_HCM_JORNADA;
  const matches = items.filter(
    (tab) =>
      normalized === tab.url || normalized.startsWith(`${tab.url}/`),
  );
  if (matches.length === 0) return SETTINGS_HCM_JORNADA;
  return [...matches].sort((a, b) => b.url.length - a.url.length)[0]!.url;
}

export function HcmSettingsNav() {
  const pathname = usePathname();
  const activeTab = useMemo(() => activeTabUrl(pathname), [pathname]);
  return <Tabs items={items} activeTab={activeTab} />;
}
