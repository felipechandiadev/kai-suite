"use client";
import LoadingState from '@/shared/components/LoadingState';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/Button";
import Switch from "@/shared/components/Switch/Switch";
import Alert from "@/shared/components/Alert/Alert";
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

  function reset() {
    setSettings(initial);
    setError(null);
  }

  return (
    <section
      className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6"
      data-test-id="settings-company-deferred-payment-section"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
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
        <LoadingState className="flex items-center justify-center py-4" />
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

          <div className="flex justify-end gap-2">
            <Button
              variant="outlinedSecondary"
              onClick={reset}
              disabled={busy || !dirty}
              data-test-id="settings-company-deferred-payment-reset"
            >
              Descartar
            </Button>
            <Button
              variant="primary"
              onClick={() => void save()}
              disabled={busy || !dirty}
              data-test-id="settings-company-deferred-payment-save"
            >
              {busy ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
