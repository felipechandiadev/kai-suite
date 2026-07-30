"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Tabs } from "@kai/ui";
import {
  HCM_WORK_SCHEDULES,
  HCM_WORK_SCHEDULES_COMPENSATORY,
  HCM_WORK_SCHEDULES_EXCEPTIONS,
  HCM_WORK_SCHEDULES_SHIFTS,
  HCM_WORK_SCHEDULES_STATEMENTS,
  HCM_WORK_SCHEDULES_TEMPLATES,
} from "@/navigation/hcm-routes";

const BASE = HCM_WORK_SCHEDULES;

const ALL_ITEMS = [
  { url: BASE, label: "Planificación" },
  { url: HCM_WORK_SCHEDULES_SHIFTS, label: "Turnos UL" },
  { url: HCM_WORK_SCHEDULES_TEMPLATES, label: "Plantillas" },
  { url: HCM_WORK_SCHEDULES_EXCEPTIONS, label: "Excepciones" },
  { url: HCM_WORK_SCHEDULES_COMPENSATORY, label: "Bolsa descanso" },
  { url: HCM_WORK_SCHEDULES_STATEMENTS, label: "Comprobantes" },
];

/** Ocultos temporalmente en la UI; las rutas siguen activas. */
const TEMPORARY_HIDDEN_TAB_URLS = new Set<string>([
  HCM_WORK_SCHEDULES_TEMPLATES,
  HCM_WORK_SCHEDULES_EXCEPTIONS,
  HCM_WORK_SCHEDULES_COMPENSATORY,
  HCM_WORK_SCHEDULES_STATEMENTS,
]);

const visibleItems = ALL_ITEMS.filter((tab) => !TEMPORARY_HIDDEN_TAB_URLS.has(tab.url));

function activeTabUrl(pathname: string): string {
  const matches = ALL_ITEMS.filter((tab) => {
    if (tab.url === BASE) {
      return pathname === BASE || pathname === `${BASE}/`;
    }
    return pathname === tab.url || pathname.startsWith(`${tab.url}/`);
  });
  if (matches.length === 0) return BASE;
  return [...matches].sort((a, b) => b.url.length - a.url.length)[0]!.url;
}

export function JornadaTabs() {
  const pathname = usePathname();
  const activeTab = useMemo(() => activeTabUrl(pathname), [pathname]);

  return (
    <div className="w-fit max-w-full shrink-0 border-b border-border">
      <Tabs items={visibleItems} activeTab={activeTab} />
    </div>
  );
}
