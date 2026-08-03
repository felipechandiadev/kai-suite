"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, IconButton, Switch } from "@kai/ui";
import {
  getCompanyTipSettingsAction,
  replaceCompanyTipSettingsAction,
} from "@/features/kaifood-tips/actions/kaifood-tips.action";
import {
  defaultCompanyTipSettings,
  type CompanyTipSettings,
} from "@/features/kaifood-tips/types/company-tips.types";

type Props = {
  companyId: string;
};

function mergeTipSettings(
  partial: Partial<CompanyTipSettings> | null | undefined,
): CompanyTipSettings {
  const base = defaultCompanyTipSettings();
  return {
    ...base,
    ...partial,
    distributionWeights: partial?.distributionWeights ?? base.distributionWeights,
  };
}

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
      setSettings(mergeTipSettings(res.tipSettings));
      setError(null);
    });
  }, [companyId]);

  const save = () => {
    setError(null);
    // Solo cambia `enabled`; el resto del JSON se reenvía intacto (defaults + cargado).
    const payload = mergeTipSettings({
      ...settings,
      enabled: settings.enabled,
    });
    startTransition(() => {
      void replaceCompanyTipSettingsAction(companyId, payload).then((res) => {
        if (!res.success) {
          setError(res.message);
          return;
        }
        setSettings(mergeTipSettings(res.tipSettings));
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
            Opt-in por empresa. Al activar, la pre-cuenta y el cobro del POS
            muestran propina sugerida (no forma parte de la boleta).
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

      <div className="mt-3">
        <Switch
          label="Usar propinas"
          checked={settings.enabled}
          onChange={(v) => setSettings((s) => ({ ...s, enabled: v }))}
          data-test-id="kaifood-tips-enabled"
        />
      </div>
    </section>
  );
}
