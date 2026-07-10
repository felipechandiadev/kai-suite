"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Switch } from "@kai/ui";
import { updateFulfillmentSettingsAction } from "@/features/e-shop-fulfillment/actions/eshop-fulfillment.action";
import type { EShopFulfillmentSettings, EShopStockPolicy } from "@/features/e-shop-fulfillment/types/eshop-fulfillment.types";
import { STOCK_POLICY_LABELS } from "@/features/e-shop-fulfillment/lib/eshop-fulfillment-labels";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import type { StorageListItem } from "@/features/inventory-storages/types/storage.types";
import type { PriceListListItem } from "@/features/sales-price-lists/types/price-list.types";
import {
  EShopOperationalSettingsPanel,
  type EShopOperationalFormState,
} from "./EShopOperationalSettingsPanel";

export function FulfillmentSettingsPanel({
  initialSettings,
  branches,
  storages,
  priceLists,
}: {
  initialSettings: EShopFulfillmentSettings;
  branches: BranchListItem[];
  storages: StorageListItem[];
  priceLists: PriceListListItem[];
}) {
  const router = useRouter();
  const [policy, setPolicy] = useState<EShopStockPolicy>(initialSettings.eShopStockPolicy);
  const [threshold, setThreshold] = useState(
    initialSettings.eShopFreeShippingThreshold != null
      ? String(initialSettings.eShopFreeShippingThreshold)
      : "",
  );
  const [portalEnabled, setPortalEnabled] = useState(
    initialSettings.eShopCustomerPortalEnabled === true,
  );
  const [requireRut, setRequireRut] = useState(
    initialSettings.eShopRegistrationRequireRut === true,
  );
  const [showDebts, setShowDebts] = useState(
    initialSettings.eShopShowDebtsInPortal !== false,
  );
  const [operational, setOperational] = useState<EShopOperationalFormState>({
    eShopDefaultBranchId: initialSettings.eShopDefaultBranchId,
    eShopDefaultStorageId: initialSettings.eShopDefaultStorageId,
    eShopDefaultPriceListId: initialSettings.eShopDefaultPriceListId,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="max-w-xl space-y-6">
      <EShopOperationalSettingsPanel
        value={operational}
        onChange={setOperational}
        branches={branches}
        storages={storages}
        priceLists={priceLists}
        disabled={busy}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Política de stock en checkout</h2>
        <p className="text-sm text-muted-foreground">
          Define qué ocurre cuando un cliente pide más unidades de las disponibles en el almacén eShop.
        </p>
        <div className="space-y-2">
          {(Object.keys(STOCK_POLICY_LABELS) as EShopStockPolicy[]).map((key) => (
            <label key={key} className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name="stockPolicy"
                checked={policy === key}
                onChange={() => setPolicy(key)}
                className="mt-1"
              />
              <span>{STOCK_POLICY_LABELS[key]}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <TextField
          label="Umbral envío gratis global (CLP)"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          helperText="Usado por métodos FREE_OVER_THRESHOLD sin umbral propio."
        />
      </section>

      <section className="space-y-4 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold">Portal Mi cuenta (cliente)</h2>
        <p className="text-sm text-muted-foreground">
          Permite que los compradores se registren y vean pedidos, pagos y deudas en la tienda web.
        </p>
        <label className="flex items-center justify-between gap-4 text-sm">
          <span>Habilitar portal de cliente</span>
          <Switch checked={portalEnabled} onChange={setPortalEnabled} />
        </label>
        <label className="flex items-center justify-between gap-4 text-sm">
          <span>RUT obligatorio al registrarse</span>
          <Switch checked={requireRut} onChange={setRequireRut} disabled={!portalEnabled} />
        </label>
        <label className="flex items-center justify-between gap-4 text-sm">
          <span>Mostrar deudas y cuotas en el portal</span>
          <Switch checked={showDebts} onChange={setShowDebts} disabled={!portalEnabled} />
        </label>
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button
        variant="primary"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          setError(null);
          updateFulfillmentSettingsAction({
            eShopStockPolicy: policy,
            eShopFreeShippingThreshold: threshold ? Number(threshold) : null,
            eShopCustomerPortalEnabled: portalEnabled,
            eShopRegistrationRequireRut: requireRut,
            eShopShowDebtsInPortal: showDebts,
            eShopDefaultBranchId: operational.eShopDefaultBranchId,
            eShopDefaultStorageId: operational.eShopDefaultStorageId,
            eShopDefaultPriceListId: operational.eShopDefaultPriceListId,
          })
            .then((r) => {
              if (!r.success) setError(r.error);
              else router.refresh();
            })
            .finally(() => setBusy(false));
        }}
      >
        Guardar configuración
      </Button>
    </div>
  );
}
