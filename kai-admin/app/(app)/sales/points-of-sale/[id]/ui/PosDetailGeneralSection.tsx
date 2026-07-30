"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, SelectDefault as Select, Switch, TextField } from "@kai/ui";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import type { StorageListItem } from "@/features/inventory-storages/types/storage.types";
import type { PointOfSaleListItem, PosKind } from "@/features/sales-points-of-sale/types/point-of-sale.types";
import type { PriceListListItem } from "@/features/sales-price-lists/types/price-list.types";
import { updatePointOfSaleAction } from "@/features/sales-points-of-sale/actions/point-of-sale.action";
import { getCompanyDeferredPaymentSettingsAction } from "@/features/companies/actions/companies-deferred-payment.action";
import { buildPosUpdateInput } from "./build-pos-update-input";

type Props = {
  point: PointOfSaleListItem;
  branches: BranchListItem[];
  storages: StorageListItem[];
  priceListCatalog: PriceListListItem[];
  companyId: string | null;
  onPointUpdated: (next: PointOfSaleListItem) => void;
};

export function PosDetailGeneralSection({
  point,
  branches,
  storages,
  priceListCatalog,
  companyId,
  onPointUpdated,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(point.name);
  const [branchId, setBranchId] = useState(point.branchId ?? "");
  const [storageId, setStorageId] = useState(point.storageId ?? "");
  const [deviceId, setDeviceId] = useState(
    point.deviceId != null && String(point.deviceId).trim() ? String(point.deviceId) : "",
  );
  const [isActive, setIsActive] = useState(point.isActive);
  const [posKind, setPosKind] = useState<PosKind>(point.kind ?? "SALE");
  const [acceptsPresaleTickets, setAcceptsPresaleTickets] = useState(Boolean(point.acceptsPresaleTickets));
  const [allowsDeferredPayment, setAllowsDeferredPayment] = useState(Boolean(point.allowsDeferredPayment));
  const [companyDeferredPaymentEnabled, setCompanyDeferredPaymentEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const branchOptions = useMemo(
    () => branches.map((b) => ({ id: b.id, label: b.name })),
    [branches],
  );
  const hasBranches = branchOptions.length > 0;

  const storeRoomOptions = useMemo(
    () =>
      (storages ?? [])
        .filter((s) => s.branchId === branchId && s.type === "STORE" && s.isActive)
        .map((s) => ({ id: s.id, label: s.name })),
    [storages, branchId],
  );

  useEffect(() => {
    setName(point.name);
    setBranchId(point.branchId ?? branches[0]?.id ?? "");
    setStorageId(point.storageId ?? "");
    setDeviceId(point.deviceId != null && String(point.deviceId).trim() ? String(point.deviceId) : "");
    setIsActive(point.isActive);
    setPosKind(point.kind ?? "SALE");
    setAcceptsPresaleTickets(Boolean(point.acceptsPresaleTickets));
    setAllowsDeferredPayment(Boolean(point.allowsDeferredPayment));
  }, [point, branches]);

  useEffect(() => {
    const cid = (companyId ?? "").trim();
    if (!cid) {
      setCompanyDeferredPaymentEnabled(false);
      return;
    }
    let cancelled = false;
    void getCompanyDeferredPaymentSettingsAction(cid).then((res) => {
      if (!cancelled) {
        setCompanyDeferredPaymentEnabled(res.success && res.deferredPayment.enabled === true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  useEffect(() => {
    if (!branchId) {
      setStorageId("");
      return;
    }
    setStorageId((prev) => {
      if (prev && storeRoomOptions.some((o) => o.id === prev)) return prev;
      return storeRoomOptions[0]?.id ?? "";
    });
  }, [branchId, storeRoomOptions]);

  const canSave =
    !isPending &&
    name.trim().length > 0 &&
    hasBranches &&
    Boolean(branchId) &&
    storeRoomOptions.length > 0 &&
    Boolean(storageId);

  const handleSave = () => {
    setError(null);
    setSuccess(null);
    startTransition(() => {
      void (async () => {
        const input = buildPosUpdateInput(
          point,
          {
            name,
            branchId,
            storageId,
            deviceId: deviceId.trim() || null,
            isActive,
            kind: posKind,
            acceptsPresaleTickets,
            allowsDeferredPayment,
          },
          priceListCatalog,
        );
        const r = await updatePointOfSaleAction(input);
        if (!r.success) {
          setError(r.error);
          return;
        }
        onPointUpdated(r.pointOfSale);
        setSuccess("Cambios guardados.");
        router.refresh();
      })();
    });
  };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-background p-4" data-test-id="pos-detail-general">
      {error ? <Alert variant="error">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      <TextField
        label="Nombre"
        name="pos-detail-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        data-test-id="pos-detail-name"
      />

      {hasBranches ? (
        <Select
          label="Sucursal"
          name="pos-detail-branch"
          value={branchId}
          onChange={(id) => {
            if (id != null && id !== "") setBranchId(String(id));
          }}
          options={branchOptions}
          required
          data-test-id="pos-detail-branch"
        />
      ) : (
        <p className="text-sm text-muted-foreground">No hay sucursales disponibles.</p>
      )}

      {hasBranches ? (
        storeRoomOptions.length === 0 ? (
          <p className="text-sm text-amber-800 dark:text-amber-200">
            No hay almacenes tipo sala de venta en esta sucursal.
          </p>
        ) : (
          <Select
            label="Sala de venta (stock POS)"
            name="pos-detail-storage"
            value={storageId}
            onChange={(id) => {
              if (id != null && id !== "") setStorageId(String(id));
            }}
            options={storeRoomOptions}
            required
            data-test-id="pos-detail-storage"
          />
        )
      ) : null}

      <TextField
        label="ID de dispositivo (opcional)"
        name="pos-detail-device"
        value={deviceId}
        onChange={(e) => setDeviceId(e.target.value)}
        data-test-id="pos-detail-device"
      />

      <Switch
        checked={isActive}
        onChange={setIsActive}
        label="Punto de venta activo"
        labelPosition="right"
        data-test-id="pos-detail-active"
      />

      <Select
        label="Tipo de punto"
        name="pos-detail-kind"
        value={posKind}
        onChange={(id) => {
          if (id === "PRESALE" || id === "SALE") {
            setPosKind(id);
            if (id === "PRESALE") {
              setAcceptsPresaleTickets(false);
              setAllowsDeferredPayment(false);
            }
          }
        }}
        options={[
          { id: "SALE", label: "Caja (cobro)" },
          { id: "PRESALE", label: "Preventa (armado de carrito)" },
        ]}
        required
        data-test-id="pos-detail-kind"
      />

      {posKind === "SALE" ? (
        <>
          <Switch
            checked={acceptsPresaleTickets}
            onChange={setAcceptsPresaleTickets}
            label="Acepta tickets de preventa"
            labelPosition="right"
            data-test-id="pos-detail-accepts-presale"
          />
          <Switch
            checked={allowsDeferredPayment}
            onChange={setAllowsDeferredPayment}
            label="Permite venta sin pago"
            labelPosition="right"
            disabled={!companyDeferredPaymentEnabled}
            data-test-id="pos-detail-allows-deferred-payment"
          />
          {!companyDeferredPaymentEnabled ? (
            <p className="text-xs text-muted-foreground">
              Activa «Venta sin pago inmediato» en Configuración → Empresa → Crédito interno.
            </p>
          ) : null}
        </>
      ) : null}

      <div className="flex justify-end pt-2">
        <Button variant="primary" size="md" onClick={handleSave} disabled={!canSave} data-test-id="pos-detail-general-save">
          Guardar
        </Button>
      </div>
    </div>
  );
}
