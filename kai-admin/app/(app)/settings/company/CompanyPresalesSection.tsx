"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, IconButton, LoadingState, Switch } from "@kai/ui";
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
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getCompanyPresaleSettingsAction(companyId)
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setSettings(res.presaleSettings);
          setInitial(res.presaleSettings);
        } else {
          setLoadError(res.error);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : "Error al cargar");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const dirty = settings.enabled !== initial.enabled;

  async function save() {
    if (!companyId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await replaceCompanyPresaleSettingsAction(companyId, settings);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setSettings(res.presaleSettings);
      setInitial(res.presaleSettings);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const saveDisabled =
    !companyId || !!loadError || loading || busy || !dirty;

  return (
    <section
      className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6"
      data-test-id="company-presales-section"
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Preventa POS
        </h2>
      </div>

      {!companyId ? (
        <p className="text-sm text-muted-foreground">
          La configuración requiere una empresa registrada.
        </p>
      ) : loadError ? (
        <p className="text-sm text-error">{loadError}</p>
      ) : loading ? (
        <div className="flex flex-col gap-4">
          <LoadingState className="flex items-center justify-center py-4" />
          <div className="flex justify-end">
            <IconButton
              icon="Save"
              variant="primary"
              size="sm"
              ariaLabel="Guardar preventa"
              title="Guardar"
              disabled
              isLoading
              data-test-id="company-presales-save"
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {error ? <Alert variant="error">{error}</Alert> : null}

          <p className="text-sm text-muted-foreground">
            Permite puntos de preventa que generan tickets con código QR para cobrar
            en caja. Cada punto de venta se configura por separado.
          </p>

          <Switch
            checked={settings.enabled}
            onChange={(v) => setSettings((s) => ({ ...s, enabled: v }))}
            label="Módulo de preventa habilitado"
            labelPosition="right"
            disabled={busy}
            data-test-id="company-presales-enabled"
          />

          <div className="flex justify-end">
            <IconButton
              icon="Save"
              variant="primary"
              size="sm"
              ariaLabel="Guardar preventa"
              title="Guardar"
              disabled={saveDisabled}
              isLoading={busy}
              onClick={() => void save()}
              data-test-id="company-presales-save"
            />
          </div>
        </div>
      )}
    </section>
  );
}
