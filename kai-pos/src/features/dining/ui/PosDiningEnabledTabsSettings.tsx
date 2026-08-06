"use client";

import { useCallback, useEffect, useState } from "react";
import { Switch } from "@kai/ui";
import {
  ALL_POS_DINING_TABS,
  readPosDiningEnabledTabs,
  writePosDiningEnabledTabs,
  type PosDiningTabKey,
} from "@/features/dining/lib/dining-enabled-tabs-storage";
import {
  isKaiFoodEnabled,
  isKaiFoodEnabledForCompany,
} from "@/config/kaifood-module.config";
import { getCompanyDetailsAction } from "@/features/company/actions/company.action";
import { shouldUseBackendApi } from "@/features/pos-offline/infrastructure/connectivity";

const TAB_LABELS: Record<PosDiningTabKey, string> = {
  mesas: "Mesas",
  barra: "Barra",
  takeaway: "Para llevar",
};

/**
 * Preferencia local: qué pestañas de cuentas mostrar en /accounts.
 * Solo visible con KaiFood habilitado.
 */
export function PosDiningEnabledTabsSettings() {
  const [visible, setVisible] = useState(false);
  const [enabled, setEnabled] = useState<PosDiningTabKey[]>([
    ...ALL_POS_DINING_TABS,
  ]);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    setEnabled(readPosDiningEnabledTabs());
    if (!shouldUseBackendApi()) {
      setVisible(isKaiFoodEnabled());
      return;
    }
    void getCompanyDetailsAction()
      .then((d) => {
        setVisible(isKaiFoodEnabledForCompany(d?.kaiProduct ?? null));
      })
      .catch(() => setVisible(isKaiFoodEnabled()));
  }, []);

  const persist = useCallback((next: PosDiningTabKey[]) => {
    writePosDiningEnabledTabs(next);
    const cleaned = readPosDiningEnabledTabs();
    setEnabled(cleaned);
    setSavedMsg("Tipos de cuenta guardados en este dispositivo.");
  }, []);

  const toggle = (tab: PosDiningTabKey, on: boolean) => {
    const next = on
      ? ALL_POS_DINING_TABS.filter((t) => enabled.includes(t) || t === tab)
      : enabled.filter((t) => t !== tab);
    persist(next);
  };

  if (!visible) return null;

  return (
    <section
      className="rounded-lg border p-4"
      style={{
        borderColor: "var(--color-border)",
        backgroundColor: "var(--color-background)",
      }}
      data-test-id="pos-settings-dining-tabs-section"
    >
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-foreground">Tipos de cuenta</h2>
        <p
          className="mt-1 text-sm leading-relaxed"
          style={{ color: "var(--color-muted-foreground, #737373)" }}
        >
          Qué pestañas mostrar en Cuentas (Mesas, Barra, Para llevar). Se guarda
          solo en este dispositivo.
        </p>
      </div>
      <div className="mt-4 space-y-3" data-test-id="pos-settings-dining-tabs">
        <p className="text-xs text-muted-foreground">
          Debe quedar al menos un tipo activo.
        </p>
        <div className="space-y-2">
          {ALL_POS_DINING_TABS.map((tab) => (
            <Switch
              key={tab}
              checked={enabled.includes(tab)}
              onChange={(on) => toggle(tab, on)}
              label={TAB_LABELS[tab]}
              labelPosition="right"
              data-test-id={`pos-settings-dining-tab-${tab}`}
            />
          ))}
        </div>
        {savedMsg ? (
          <p
            className="text-xs text-muted-foreground"
            data-test-id="pos-settings-dining-tabs-saved"
          >
            {savedMsg}
          </p>
        ) : null}
      </div>
    </section>
  );
}
