"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, IconButton, Select, Switch, TextField } from "@kai/ui";
import {
  getCompanyTipSettingsAction,
  replaceCompanyTipSettingsAction,
} from "@/features/kaifood-tips/actions/kaifood-tips.action";
import {
  defaultCompanyTipSettings,
  type CompanyTipSettings,
  type TipDistributionMode,
} from "@/features/kaifood-tips/types/company-tips.types";

type Props = {
  companyId: string;
};

const DISTRIBUTION_OPTIONS: Array<{ id: TipDistributionMode; label: string }> =
  [
    { id: "NONE", label: "Sin distribución en Kai (solo captura)" },
    { id: "DIRECT", label: "Directo al mesero (futuro)" },
    { id: "POOL", label: "Pozo / pooling (futuro)" },
    { id: "POINTS", label: "Puntos / tronco (futuro)" },
  ];

export function KaifoodTipsSettingsPanel({ companyId }: Props) {
  const router = useRouter();
  const [settings, setSettings] = useState<CompanyTipSettings>(
    defaultCompanyTipSettings(),
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    void getCompanyTipSettingsAction(companyId).then((res) => {
      setLoading(false);
      if (!res.success) {
        setError(res.message);
        return;
      }
      setSettings(res.tipSettings);
      setError(null);
    });
  }, [companyId]);

  const save = () => {
    setError(null);
    startTransition(() => {
      void replaceCompanyTipSettingsAction(companyId, settings).then((res) => {
        if (!res.success) {
          setError(res.message);
          return;
        }
        setSettings(res.tipSettings);
        router.refresh();
      });
    });
  };

  return (
    <section
      className="rounded-xl border border-border bg-card p-4"
      data-test-id="kaifood-tips-settings"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">Propinas</h2>
          <p className="text-xs text-muted-foreground">
            Configuración de empresa (Ley 20.729). Opt-in: desactivado por
            defecto.
          </p>
        </div>
        <IconButton
          icon="Save"
          variant="primary"
          size="sm"
          ariaLabel="Guardar propinas"
          disabled={pending || loading || !companyId}
          isLoading={pending}
          onClick={save}
          data-test-id="kaifood-tips-save"
        />
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="mt-3 flex flex-col gap-4">
        <Switch
          label="Usar propinas"
          checked={settings.enabled}
          onChange={(v) => setSettings((s) => ({ ...s, enabled: v }))}
          data-test-id="kaifood-tips-enabled"
        />

        {settings.enabled ? (
          <>
            <TextField
              label="% sugerido"
              type="number"
              min={0}
              max={100}
              value={String(settings.suggestPercent)}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  suggestPercent: Math.min(
                    100,
                    Math.max(0, Number(e.target.value) || 0),
                  ),
                }))
              }
              data-test-id="kaifood-tips-percent"
            />
            <Switch
              label="Permitir modificar / rechazar monto"
              checked={settings.allowCustomAmount}
              onChange={(v) =>
                setSettings((s) => ({ ...s, allowCustomAmount: v }))
              }
            />
            <Switch
              label="Permitir propina en efectivo"
              checked={settings.allowCashTips}
              onChange={(v) => setSettings((s) => ({ ...s, allowCashTips: v }))}
            />
            <Select
              label="Modo de atribución (post-cobro)"
              alwaysShowLabel
              value={settings.distributionMode}
              onChange={(id) =>
                setSettings((s) => ({
                  ...s,
                  distributionMode: String(id ?? "NONE") as TipDistributionMode,
                }))
              }
              options={DISTRIBUTION_OPTIONS}
            />
            <p className="text-xs text-muted-foreground">
              El reparto automatizado (pozo/puntos) se implementa en fases
              posteriores. Hoy solo se captura y acumula en el ledger.
            </p>
          </>
        ) : null}
      </div>
    </section>
  );
}
