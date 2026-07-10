"use client";
import { LoadingState } from '@kai/ui';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kai/ui";
import { Switch } from "@kai/ui";
import { Alert } from "@kai/ui";
import type { CompanyDetails } from "@/features/settings-branches/infrastructure/company.request";
import {
  defaultCompanyInternalCustomerCreditSettings,
  type CompanyInternalCustomerCreditSettings,
} from "@/features/companies/types/company-internal-customer-credit.types";
import {
  getCompanyInternalCustomerCreditSettingsAction,
  replaceCompanyInternalCustomerCreditSettingsAction,
} from "@/features/companies/actions/companies-internal-customer-credit.action";

type Props = {
  company: CompanyDetails;
};

export function CompanyInternalCustomerCreditSection({ company }: Props) {
  const router = useRouter();
  const companyId = company.id;

  const [settings, setSettings] = useState<CompanyInternalCustomerCreditSettings>(
    defaultCompanyInternalCustomerCreditSettings(),
  );
  const [initial, setInitial] = useState<CompanyInternalCustomerCreditSettings>(
    defaultCompanyInternalCustomerCreditSettings(),
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
    getCompanyInternalCustomerCreditSettingsAction(companyId)
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setSettings(res.internalCustomerCredit);
          setInitial(res.internalCustomerCredit);
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

  async function save() {
    if (!companyId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await replaceCompanyInternalCustomerCreditSettingsAction(
        companyId,
        settings,
      );
      if (!res.success) {
        setError(res.error);
        return;
      }
      setSettings(res.internalCustomerCredit);
      setInitial(res.internalCustomerCredit);
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
      data-test-id="settings-company-internal-customer-credit-section"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Crédito interno (clientes)
        </h2>
      </div>

      {!companyId ? (
        <p className="text-sm text-muted-foreground">
          La configuración requiere una empresa registrada.
        </p>
      ) : loadError ? (
        <p className="text-sm text-error">{loadError}</p>
      ) : loading ? (
        <LoadingState className="flex items-center justify-center py-4" />
      ) : (
        <div className="flex flex-col gap-4">
          {error ? <Alert variant="error">{error}</Alert> : null}

          <p className="text-sm text-muted-foreground">
            Si está desactivado, no se podrán asignar límites de crédito a clientes, se
            desactivan los medios de pago tipo «Crédito interno» en la empresa y en los
            puntos de venta, y el POS no los mostrará como disponibles.
          </p>

          <Switch
            label="Habilitar crédito interno para clientes"
            labelPosition="right"
            checked={settings.enabled}
            disabled={busy}
            onChange={(v) => setSettings((s) => ({ ...s, enabled: v }))}
            data-test-id="settings-company-internal-credit-enabled"
          />

          <div className="flex justify-end gap-2">
            <Button
              variant="outlinedSecondary"
              onClick={reset}
              disabled={busy || !dirty}
              data-test-id="settings-company-internal-credit-reset"
            >
              Descartar
            </Button>
            <Button
              variant="primary"
              onClick={() => void save()}
              disabled={busy || !dirty}
              data-test-id="settings-company-internal-credit-save"
            >
              {busy ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
