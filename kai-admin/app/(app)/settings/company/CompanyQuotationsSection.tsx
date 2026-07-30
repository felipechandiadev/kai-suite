"use client";
import { LoadingState } from '@kai/ui';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kai/ui";
import { Switch } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Alert } from "@kai/ui";
import type { CompanyDetails } from "@/features/settings-branches/infrastructure/company.request";
import {
  defaultCompanyQuotationSettings,
  type CompanyQuotationSettings,
} from "@/features/companies/types/company-quotations.types";
import {
  getCompanyQuotationSettingsAction,
  replaceCompanyQuotationSettingsAction,
} from "@/features/companies/actions/companies-quotations.action";

type Props = {
  company: CompanyDetails;
};

export function CompanyQuotationsSection({ company }: Props) {
  const router = useRouter();
  const companyId = company.id;

  const [settings, setSettings] = useState<CompanyQuotationSettings>(
    defaultCompanyQuotationSettings(),
  );
  const [initial, setInitial] = useState<CompanyQuotationSettings>(
    defaultCompanyQuotationSettings(),
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
    getCompanyQuotationSettingsAction(companyId)
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setSettings(res.quotationSettings);
          setInitial(res.quotationSettings);
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

  const dirty = JSON.stringify(settings) !== JSON.stringify(initial);

  function patch(part: Partial<CompanyQuotationSettings>) {
    setSettings((s) => {
      const next = { ...s, ...part } as CompanyQuotationSettings;
      if (next.maxValidityDays < next.defaultValidityDays) {
        next.maxValidityDays = next.defaultValidityDays;
      }
      return next;
    });
  }

  async function save() {
    if (!companyId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await replaceCompanyQuotationSettingsAction(
        companyId,
        settings,
      );
      if (!res.success) {
        setError(res.error);
        return;
      }
      setSettings(res.quotationSettings);
      setInitial(res.quotationSettings);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setSettings(initial);
    setError(null);
  }

  return (
    <section
      className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6"
      data-test-id="settings-company-quotations-section"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Cotizaciones
        </h2>
      </div>

      {!companyId ? (
        <p className="text-sm text-muted-foreground">
          La configuración de cotizaciones requiere una empresa registrada.
        </p>
      ) : loadError ? (
        <p className="text-sm text-error">{loadError}</p>
      ) : loading ? (
        <LoadingState className="flex items-center justify-center py-4" />
      ) : (
        <div className="flex flex-col gap-4">
          {error ? <Alert variant="error">{error}</Alert> : null}

          <Switch
            label="Habilitar emisión de cotizaciones"
            labelPosition="right"
            checked={settings.enabled}
            disabled={busy}
            onChange={(v) => patch({ enabled: v })}
            data-test-id="settings-company-quotations-enabled"
          />

          {settings.enabled ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Vigencia por defecto (días)"
                  type="number"
                  min={1}
                  max={365}
                  value={String(settings.defaultValidityDays)}
                  onChange={(e) =>
                    patch({
                      defaultValidityDays:
                        Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                  data-test-id="settings-company-quotations-default-days"
                  disabled={busy}
                />
                <TextField
                  label="Vigencia máxima permitida (días)"
                  type="number"
                  min={1}
                  max={1825}
                  value={String(settings.maxValidityDays)}
                  onChange={(e) =>
                    patch({
                      maxValidityDays: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                  data-test-id="settings-company-quotations-max-days"
                  disabled={busy}
                />
              </div>

              <Switch
                label="Permitir editar la vigencia por cotización"
                labelPosition="right"
                checked={settings.allowCustomValidity}
                disabled={busy}
                onChange={(v) => patch({ allowCustomValidity: v })}
                data-test-id="settings-company-quotations-custom-validity"
              />

              <TextField
                label="Términos y condiciones por defecto"
                value={settings.defaultTerms ?? ""}
                onChange={(e) =>
                  patch({
                    defaultTerms: e.target.value.trim()
                      ? e.target.value
                      : null,
                  })
                }
                rows={3}
                data-test-id="settings-company-quotations-terms"
                disabled={busy}
              />
            </>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              variant="outlinedSecondary"
              onClick={reset}
              disabled={busy || !dirty}
              data-test-id="settings-company-quotations-reset"
            >
              Descartar
            </Button>
            <Button
              variant="primary"
              onClick={save}
              disabled={busy || !dirty}
              data-test-id="settings-company-quotations-save"
            >
              {busy ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
