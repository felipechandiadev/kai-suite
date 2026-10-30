"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, IconButton, LoadingState, Select } from "@kai/ui";
import type { CompanyDetails } from "@/features/settings-branches/infrastructure/company.request";
import {
  defaultCompanyInventorySettings,
  type CompanyInventorySettings,
} from "@/features/companies/types/company-inventory.types";
import {
  getCompanyInventorySettingsAction,
  replaceCompanyInventorySettingsAction,
} from "@/features/companies/actions/companies-inventory.action";

type Props = { company: CompanyDetails };

export function CompanyInventorySection({ company }: Props) {
  const router = useRouter();
  const companyId = company.id;
  const [settings, setSettings] = useState<CompanyInventorySettings>(
    defaultCompanyInventorySettings(),
  );
  const [initial, setInitial] = useState<CompanyInventorySettings>(
    defaultCompanyInventorySettings(),
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
    getCompanyInventorySettingsAction(companyId)
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setSettings(res.inventorySettings);
          setInitial(res.inventorySettings);
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

  const dirty = settings.negativeStockPolicy !== initial.negativeStockPolicy;

  async function save() {
    if (!companyId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await replaceCompanyInventorySettingsAction(companyId, settings);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setSettings(res.inventorySettings);
      setInitial(res.inventorySettings);
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
      data-test-id="company-inventory-section"
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Inventario
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
              ariaLabel="Guardar inventario"
              title="Guardar"
              disabled
              isLoading
              data-test-id="company-inventory-save"
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {error ? <Alert variant="error">{error}</Alert> : null}

          <p className="text-sm text-muted-foreground">
            Qué hacer cuando una venta pide más stock del disponible. Una variante marcada
            con «permitir stock negativo» siempre se vende.
          </p>

          <div className="max-w-sm">
            <Select
              label="Venta sin stock suficiente"
              name="negative-stock-policy"
              options={[
                { id: "BLOCK", label: "Bloquear la venta" },
                { id: "WARN", label: "Permitir y dejar aviso" },
                { id: "ALLOW", label: "Permitir" },
              ]}
              value={settings.negativeStockPolicy}
              onChange={(v) =>
                setSettings((s) => ({
                  ...s,
                  negativeStockPolicy: (String(v) as CompanyInventorySettings["negativeStockPolicy"]) || "BLOCK",
                }))
              }
              disabled={busy}
              data-test-id="company-inventory-negative-policy"
            />
          </div>

          <div className="flex justify-end">
            <IconButton
              icon="Save"
              variant="primary"
              size="sm"
              ariaLabel="Guardar inventario"
              title="Guardar"
              disabled={saveDisabled}
              isLoading={busy}
              onClick={() => void save()}
              data-test-id="company-inventory-save"
            />
          </div>
        </div>
      )}
    </section>
  );
}
