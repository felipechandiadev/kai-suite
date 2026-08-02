"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ButtonGroupToggle } from "@kai/ui";

export const PROPINAS_TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "movimientos", label: "Movimientos" },
  { id: "saldos", label: "Saldos" },
  { id: "pendientes", label: "Pendientes" },
  { id: "pagar", label: "Pagar" },
  { id: "reportes", label: "Reportes" },
] as const;

export type PropinasTabId = (typeof PROPINAS_TABS)[number]["id"];

export function resolvePropinasTab(tabParam: string | null): PropinasTabId {
  const match = PROPINAS_TABS.find((t) => t.id === tabParam);
  return match?.id ?? "resumen";
}

export function PropinasHubTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = useMemo(
    () => resolvePropinasTab(searchParams.get("tab")),
    [searchParams],
  );

  return (
    <ButtonGroupToggle
      value={activeTab}
      onChange={(next) => {
        router.replace(`/kaifood/propinas?tab=${encodeURIComponent(next)}`);
      }}
      options={PROPINAS_TABS.map((t) => ({ id: t.id, label: t.label }))}
      data-test-id="kaifood-propinas-tabs"
    />
  );
}
