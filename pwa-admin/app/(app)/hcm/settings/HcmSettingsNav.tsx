"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Tabs } from "@kai/ui";
import {
  HCM_SETTINGS,
  HCM_SETTINGS_AFP,
  HCM_SETTINGS_CONTRACTS,
  HCM_SETTINGS_JOB_POSITIONS,
  HCM_SETTINGS_JORNADA,
  HCM_SETTINGS_LABOR_UNITS,
  HCM_SETTINGS_ORG_UNITS,
  HCM_SETTINGS_SHIFTS,
} from "@/navigation/hcm-routes";

const items = [
  { label: "Jornada", url: HCM_SETTINGS_JORNADA },
  { label: "Contratos", url: HCM_SETTINGS_CONTRACTS },
  { label: "Sistemas de jornada", url: HCM_SETTINGS_SHIFTS },
  { label: "Cargos", url: HCM_SETTINGS_JOB_POSITIONS },
  { label: "AFP", url: HCM_SETTINGS_AFP },
  { label: "Unidades organizativas", url: HCM_SETTINGS_ORG_UNITS },
  { label: "Unidades laborales", url: HCM_SETTINGS_LABOR_UNITS },
];

function activeTabUrl(pathname: string): string {
  const normalized = pathname.replace(/\/$/, "") || "/";
  if (normalized === HCM_SETTINGS) return HCM_SETTINGS_JORNADA;
  const matches = items.filter(
    (tab) =>
      normalized === tab.url || normalized.startsWith(`${tab.url}/`),
  );
  if (matches.length === 0) return HCM_SETTINGS_JORNADA;
  return [...matches].sort((a, b) => b.url.length - a.url.length)[0]!.url;
}

export function HcmSettingsNav() {
  const pathname = usePathname();
  const activeTab = useMemo(() => activeTabUrl(pathname), [pathname]);
  return <Tabs items={items} activeTab={activeTab} />;
}
