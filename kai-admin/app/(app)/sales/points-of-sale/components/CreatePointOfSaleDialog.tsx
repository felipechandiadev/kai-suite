"use client";
import { LoadingState } from '@kai/ui';

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { SelectDefault as Select } from "@kai/ui";
import { Switch } from "@kai/ui";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import type { PriceListListItem } from "@/features/sales-price-lists/types/price-list.types";
import type { StorageListItem } from "@/features/inventory-storages/types/storage.types";
import { createPointOfSaleAction } from "@/features/sales-points-of-sale/actions/point-of-sale.action";
import { getCompanyPaymentMethodsAction } from "@/features/companies/actions/companies-payment-methods.action";
import { replacePosPaymentMethodsAction } from "@/features/sales-points-of-sale/actions/pos-payment-methods.action";
import type { CompanyPaymentMethodConfig } from "@/features/companies/types/company-payment-methods.types";
import {
  syncPosPaymentDraftWithCatalog,
  type PosPaymentMethodConfig,
} from "@/features/sales-points-of-sale/types/pos-payment-methods.types";
import { getCompanyDetailsAction } from "@/features/settings-company/actions/company.action";
import { getCompanyDeferredPaymentSettingsAction } from "@/features/companies/actions/companies-deferred-payment.action";
import type { PosKind } from "@/features/sales-points-of-sale/types/point-of-sale.types";
import {
  PosPaymentMethodsCardsEditor,
  type PosPaymentMethodsCardsEditorHandle,
} from "./PosPaymentMethodsCardsEditor";

export type CreatePointOfSaleDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Tras crear correctamente: revalidación y `router.refresh()` desde la página. */
  onSuccess?: () => void | Promise<void>;
  companyId: string | null;
  branches: BranchListItem[];
  priceListCatalog: PriceListListItem[];
  storages: StorageListItem[];
};

/**
 * Campos alineados a `PointOfSale` / `PosService.createPointOfSale`.
 */
export function CreatePointOfSaleDialog({
  open,
  onClose,
  onSuccess,
  companyId,
  branches,
  priceListCatalog,
  storages,
}: CreatePointOfSaleDialogProps) {
  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState<string>(branches[0]?.id ?? "");
  const [storageId, setStorageId] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [posKind, setPosKind] = useState<PosKind>("SALE");
  const [acceptsPresaleTickets, setAcceptsPresaleTickets] = useState(false);
  const [allowsDeferredPayment, setAllowsDeferredPayment] = useState(false);
  const [companyDeferredPaymentEnabled, setCompanyDeferredPaymentEnabled] = useState(false);
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [defaultListId, setDefaultListId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [paymentCatalog, setPaymentCatalog] = useState<CompanyPaymentMethodConfig[]>([]);
  const [posPaymentDraft, setPosPaymentDraft] = useState<PosPaymentMethodConfig[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [bankAccountOptions, setBankAccountOptions] = useState<Array<{ id: string; label: string }>>(
    [],
  );
  const paymentEditorRef = useRef<PosPaymentMethodsCardsEditorHandle>(null);
  const resolvedCompanyId = (companyId ?? "").trim();

  const branchOptions = useMemo(
    () => branches.map((b) => ({ id: b.id, label: b.name })),
    [branches],
  );

  const storeRoomOptions = useMemo(() => {
    return (storages ?? [])
      .filter((s) => s.branchId === branchId && s.type === "STORE" && s.isActive)
      .map((s) => ({ id: s.id, label: s.name }));
  }, [storages, branchId]);

  const hasBranches = branchOptions.length > 0;

  const isSalePos = posKind === "SALE";

  const submitBlockers = useMemo(() => {
    const reasons: string[] = [];
    if (!name.trim()) reasons.push("nombre");
    if (!hasBranches) reasons.push("al menos una sucursal en la empresa");
    if (hasBranches && !branchId) reasons.push("sucursal");
    if (hasBranches && storeRoomOptions.length === 0) {
      reasons.push("almacén tipo «sala de venta» en la sucursal");
    } else if (!storageId) {
      reasons.push("sala de venta (stock POS)");
    }
    if (selectedListIds.length === 0) reasons.push("al menos una lista de precio");
    if (isSalePos && loadingPayments) reasons.push("carga de medios de pago");
    return reasons;
  }, [
    name,
    hasBranches,
    branchId,
    storeRoomOptions.length,
    storageId,
    selectedListIds.length,
    isSalePos,
    loadingPayments,
  ]);

  const canSubmit = submitBlockers.length === 0 && !isPending;

  /** Solo listas marcadas; sin fila "automático". */
  const defaultListOptions = useMemo(() => {
    return selectedListIds
      .map((id) => priceListCatalog.find((p) => p.id === id))
      .filter((p): p is PriceListListItem => Boolean(p))
      .map((p) => ({ id: p.id, label: p.name + (p.isActive ? "" : " (inactiva)") }));
  }, [selectedListIds, priceListCatalog]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName("");
    setDeviceId("");
    setIsActive(true);
    setPosKind("SALE");
    setAcceptsPresaleTickets(false);
    setAllowsDeferredPayment(false);
    setSelectedListIds([]);
    setDefaultListId(null);
    setError(null);
    setBranchId(branches[0]?.id ?? "");
    setStorageId("");

    setPaymentCatalog([]);
    setPosPaymentDraft([]);
    setBankAccountOptions([]);
    setLoadingPayments(false);
  }, [open, branches]);

  useEffect(() => {
    if (!open || !resolvedCompanyId) {
      setCompanyDeferredPaymentEnabled(false);
      return;
    }
    let cancelled = false;
    void getCompanyDeferredPaymentSettingsAction(resolvedCompanyId).then((res) => {
      if (cancelled) return;
      setCompanyDeferredPaymentEnabled(res.success && res.deferredPayment.enabled === true);
    });
    return () => {
      cancelled = true;
    };
  }, [open, resolvedCompanyId]);

  useEffect(() => {
    if (!open || !resolvedCompanyId || posKind !== "SALE") {
      setLoadingPayments(false);
      return;
    }
    let cancelled = false;
    setLoadingPayments(true);
    void (async () => {
      try {
        const [res, details] = await Promise.all([
          getCompanyPaymentMethodsAction(resolvedCompanyId),
          getCompanyDetailsAction(),
        ]);
        if (cancelled) return;
        if (res.success) {
          setPaymentCatalog(res.paymentMethods);
          setPosPaymentDraft(syncPosPaymentDraftWithCatalog(res.paymentMethods, []));
        }
        if (details?.bankAccounts?.length) {
          setBankAccountOptions(
            details.bankAccounts
              .map((a) => {
                const key =
                  a.accountKey != null && String(a.accountKey).trim()
                    ? String(a.accountKey)
                    : null;
                if (!key) return null;
                return { id: key, label: `${a.bankName} · ${a.accountNumber}` };
              })
              .filter((x): x is { id: string; label: string } => Boolean(x)),
          );
        }
      } finally {
        if (!cancelled) setLoadingPayments(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, resolvedCompanyId, posKind]);

  /** Sin opción "automática": al cambiar asignación, fija la preferente en una lista concreta (la primera de la selección). */
  useEffect(() => {
    if (selectedListIds.length === 0) {
      setDefaultListId(null);
      return;
    }
    setDefaultListId((prev) => {
      if (prev != null && selectedListIds.includes(prev)) {
        return prev;
      }
      return selectedListIds[0] ?? null;
    });
  }, [selectedListIds]);

  useEffect(() => {
    if (!branchId) {
      setStorageId("");
      return;
    }
    setStorageId((prev) => {
      if (prev && storeRoomOptions.some((o) => o.id === prev)) {
        return prev;
      }
      return storeRoomOptions[0]?.id ?? "";
    });
  }, [branchId, storeRoomOptions]);

  const handleClose = () => {
    setName("");
    setBranchId(branches[0]?.id ?? "");
    setStorageId("");
    setDeviceId("");
    setIsActive(true);
    setSelectedListIds([]);
    setDefaultListId(null);
    setError(null);
    onClose();
  };

  const toggleList = (id: string) => {
    setSelectedListIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const onDefaultListChange = (v: string | number | null) => {
    if (v == null) {
      return;
    }
    setDefaultListId(String(v));
  };

  const handleSubmit = () => {
    setError(null);
    const priceLists = selectedListIds
      .map((id) => priceListCatalog.find((p) => p.id === id))
      .filter((p): p is PriceListListItem => Boolean(p))
      .map((p) => ({ id: p.id, name: p.name, isActive: p.isActive }));

    startTransition(() => {
      void (async () => {
        const r = await createPointOfSaleAction({
          name: name.trim(),
          branchId,
          storageId,
          deviceId,
          isActive,
          priceLists,
          defaultPriceListId: defaultListId,
          kind: posKind,
          acceptsPresaleTickets: posKind === "SALE" ? acceptsPresaleTickets : false,
          allowsDeferredPayment:
            posKind === "SALE" && companyDeferredPaymentEnabled
              ? allowsDeferredPayment
              : false,
        });
        if (!r.success) {
          setError(r.error);
          return;
        }

        if (resolvedCompanyId && posKind === "SALE") {
          const posId = r.pointOfSale.id;
          const paymentPayload =
            paymentEditorRef.current?.getPayload() ?? posPaymentDraft;
          const pr = await replacePosPaymentMethodsAction(posId, paymentPayload);
          if (!pr.success) {
            setError(pr.error || "El POS fue creado, pero no se pudieron guardar los medios de pago.");
            return;
          }
        }

        await onSuccess?.();
        handleClose();
      })();
    });
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Crear punto de venta"
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 640px)"
      data-test-id="point-of-sale-create-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="pos-create-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button
            variant="outlined"
            size="md"
            onClick={handleClose}
            disabled={isPending}
            data-test-id="pos-create-cancel"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!canSubmit}
            data-test-id="pos-create-submit"
          >
            Crear
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Nombre"
          name="pos-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
          required
          data-test-id="pos-create-name"
        />
        {hasBranches ? (
          <Select
            label="Sucursal"
            name="pos-branch"
            value={branchId}
            onChange={(id) => {
              if (id != null && id !== "") {
                setBranchId(String(id));
              }
            }}
            options={branchOptions}
            placeholder="Sucursal"
            required
            data-test-id="pos-create-branch"
          />
        ) : (
          <p className="text-sm text-muted-foreground" data-test-id="pos-create-branch-hint">
            No hay sucursales. Crea al menos una en Ajustes → Sucursales para poder asignar el punto de venta.
          </p>
        )}
        {hasBranches ? (
          storeRoomOptions.length === 0 ? (
            <p className="text-sm text-amber-800 dark:text-amber-200">
              No hay almacenes tipo sala de venta en esta sucursal. Créalo en Inventario → Almacenes (tipo «Sala de
              venta»).
            </p>
          ) : (
            <Select
              label="Sala de venta (stock POS)"
              name="pos-storage"
              value={storageId}
              onChange={(id) => {
                if (id != null && id !== "") {
                  setStorageId(String(id));
                }
              }}
              options={storeRoomOptions}
              placeholder="Almacén sala"
              required
              data-test-id="pos-create-storage"
            />
          )
        ) : null}
        <TextField
          label="ID de dispositivo (opcional)"
          name="pos-device"
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          placeholder="ID de dispositivo"
          data-test-id="pos-create-device"
        />
        <div className="pt-1">
          <Switch
            checked={isActive}
            onChange={setIsActive}
            label="Punto de venta activo"
            labelPosition="right"
            data-test-id="pos-create-active"
          />
        </div>
        <Select
          label="Tipo de punto"
          name="pos-kind"
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
          data-test-id="pos-create-kind"
        />
        {posKind === "SALE" ? (
          <>
            <Switch
              checked={acceptsPresaleTickets}
              onChange={setAcceptsPresaleTickets}
              label="Acepta tickets de preventa"
              labelPosition="right"
              data-test-id="pos-create-accepts-presale"
            />
            <Switch
              checked={allowsDeferredPayment}
              onChange={setAllowsDeferredPayment}
              label="Permite venta sin pago"
              labelPosition="right"
              disabled={!companyDeferredPaymentEnabled}
              data-test-id="pos-create-allows-deferred-payment"
            />
            {!companyDeferredPaymentEnabled ? (
              <p className="text-xs text-muted-foreground">
                Activa «Venta sin pago inmediato» en Configuración → Empresa → Crédito interno.
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            En preventa no se cobra: se genera un ticket con código para cobrar en caja.
          </p>
        )}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Listas de precio</p>
          <p className="text-xs text-muted-foreground">Marca las listas asociadas a este punto de venta.</p>
          {priceListCatalog.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay listas de precio. Créalas en Ventas → Listas de precio.</p>
          ) : (
            <ul className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-border p-2">
              {priceListCatalog.map((pl) => (
                <li key={pl.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`pos-create-pl-${pl.id}`}
                    className="h-4 w-4 shrink-0 rounded border-border"
                    checked={selectedListIds.includes(pl.id)}
                    onChange={() => toggleList(pl.id)}
                    data-test-id={`pos-create-pl-${pl.id}`}
                  />
                  <label htmlFor={`pos-create-pl-${pl.id}`} className="min-w-0 flex-1 cursor-pointer text-sm">
                    {pl.name}
                    {!pl.isActive && (
                      <span className="ml-1 text-xs text-muted-foreground">(inactiva)</span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
        {selectedListIds.length > 1 && (
          <Select
            label="Lista de precio preferente en este POS"
            name="pos-default-list"
            value={defaultListId ?? defaultListOptions[0]?.id}
            onChange={onDefaultListChange}
            options={defaultListOptions}
            required
            placeholder="Elegir lista"
            data-test-id="pos-create-default-list"
          />
        )}

        {posKind === "SALE" ? (
        <div className="space-y-2 pt-2">
          <p className="text-sm font-medium text-foreground">Medios de pago del POS</p>
          <p className="text-xs text-muted-foreground">
            Configura qué medios están habilitados en este punto de venta, cuáles se precargan y el orden (arrastrando).
          </p>
          {loadingPayments ? (
            <LoadingState className="flex items-center justify-center py-4" label="Cargando medios de pago" />
          ) : (
            <PosPaymentMethodsCardsEditor
              key={open ? "pos-pm-editor-create" : "pos-pm-editor-create-closed"}
              ref={paymentEditorRef}
              catalog={paymentCatalog}
              value={posPaymentDraft}
              onChange={setPosPaymentDraft}
              bankAccountOptions={bankAccountOptions}
              disabled={isPending}
              data-test-id="pos-create-payment-methods"
            />
          )}
        </div>
        ) : null}
        {!canSubmit && submitBlockers.length > 0 ? (
          <p className="text-sm text-muted-foreground" data-test-id="pos-create-submit-hint">
            Para crear el punto de venta completa: {submitBlockers.join(", ")}.
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
