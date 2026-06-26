"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/Button";
import Switch from "@/shared/components/Switch/Switch";
import Alert from "@/shared/components/Alert/Alert";
import type { CompanyDetails } from "@/features/settings-branches/infrastructure/company.request";
import {
  defaultCompanyPresaleSettings,
  type CompanyPresaleSettings,
} from "@/features/companies/types/company-presales.types";
import {
  getCompanyPresaleSettingsAction,
  replaceCompanyPresaleSettingsAction,
} from "@/features/companies/actions/companies-presales.action";

type Props = { company: CompanyDetails };

export function CompanyPresalesSection({ company }: Props) {
  const router = useRouter();
  const companyId = company.id;
  const [settings, setSettings] = useState<CompanyPresaleSettings>(
    defaultCompanyPresaleSettings(),
  );
  const [initial, setInitial] = useState<CompanyPresaleSettings>(
    defaultCompanyPresaleSettings(),
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getCompanyPresaleSettingsAction(companyId).then((res) => {
      if (cancelled) return;
      if (res.success) {
        setSettings(res.presaleSettings);
        setInitial(res.presaleSettings);
      } else {
        setError(res.error);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const dirty = settings.enabled !== initial.enabled;

  async function handleSave() {
    if (!companyId) return;
    setBusy(true);
    setError(null);
    const res = await replaceCompanyPresaleSettingsAction(companyId, settings);
    setBusy(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setSettings(res.presaleSettings);
    setInitial(res.presaleSettings);
    router.refresh();
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando preventa…</p>;
  }

  return (
    <div className="max-w-xl space-y-4" data-test-id="company-presales-section">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Preventa POS</h2>
        <p className="text-sm text-muted-foreground">
          Permite puntos de preventa que generan tickets con código QR para cobrar en caja.
        </p>
      </div>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <Switch
        checked={settings.enabled}
        onChange={(v) => setSettings((s) => ({ ...s, enabled: v }))}
        label="Módulo de preventa habilitado"
        labelPosition="right"
        data-test-id="company-presales-enabled"
      />
      <Button
        variant="primary"
        size="md"
        disabled={!dirty || busy}
        onClick={() => void handleSave()}
        data-test-id="company-presales-save"
      >
        Guardar
      </Button>
    </div>
  );
}
