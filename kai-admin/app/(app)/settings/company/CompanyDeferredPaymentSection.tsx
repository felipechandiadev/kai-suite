"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, IconButton, LoadingState, Switch } from "@kai/ui";
import type { CompanyDetails } from "@/features/settings-branches/infrastructure/company.request";
import {
  defaultCompanyDeferredPaymentSettings,
  type CompanyDeferredPaymentSettings,
} from "@/features/companies/types/company-deferred-payment.types";
import {
  getCompanyDeferredPaymentSettingsAction,
  replaceCompanyDeferredPaymentSettingsAction,
} from "@/features/companies/actions/companies-deferred-payment.action";

type Props = {
  company: CompanyDetails;
};

export function CompanyDeferredPaymentSection({ company }: Props) {
  const router = useRouter();
  const companyId = company.id;

  const [settings, setSettings] = useState<CompanyDeferredPaymentSettings>(
    defaultCompanyDeferredPaymentSettings(),
  );
  const [initial, setInitial] = useState<CompanyDeferredPaymentSettings>(
    defaultCompanyDeferredPaymentSettings(),
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
    getCompanyDeferredPaymentSettingsAction(companyId)
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setSettings(res.deferredPayment);
          setInitial(res.deferredPayment);
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
      const res = await replaceCompanyDeferredPaymentSettingsAction(companyId, settings);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setSettings(res.deferredPayment);
      setInitial(res.deferredPayment);
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
      data-test-id="settings-company-deferred-payment-section"
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Venta sin pago inmediato
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
              ariaLabel="Guardar venta sin pago inmediato"
              title="Guardar"
              disabled
              isLoading
              data-test-id="settings-company-deferred-payment-save"
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {error ? <Alert variant="error">{error}</Alert> : null}

          <p className="text-sm text-muted-foreground">
            Permite que los puntos de venta autoricen emitir ventas con cobro pendiente
            cuando hay un cliente seleccionado. Cada punto de venta debe activarlo por
            separado.
          </p>

          <Switch
            label="Habilitar venta sin pago inmediato"
            labelPosition="right"
            checked={settings.enabled}
            disabled={busy}
            onChange={(v) => setSettings((s) => ({ ...s, enabled: v }))}
            data-test-id="settings-company-deferred-payment-enabled"
          />

          <div className="flex justify-end">
            <IconButton
              icon="Save"
              variant="primary"
              size="sm"
              ariaLabel="Guardar venta sin pago inmediato"
              title="Guardar"
              disabled={saveDisabled}
              isLoading={busy}
              onClick={() => void save()}
              data-test-id="settings-company-deferred-payment-save"
            />
          </div>
        </div>
      )}
    </section>
  );
}
