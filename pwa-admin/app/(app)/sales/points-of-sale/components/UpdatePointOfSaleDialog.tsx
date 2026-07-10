"use client";
import { LoadingState } from '@kai/ui';

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { SelectDefault as Select } from "@kai/ui";
import { Switch } from "@kai/ui";
import type { PointOfSaleListItem, PosKind } from "@/features/sales-points-of-sale/types/point-of-sale.types";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import type { PriceListListItem } from "@/features/sales-price-lists/types/price-list.types";
import type { StorageListItem } from "@/features/inventory-storages/types/storage.types";
import { updatePointOfSaleAction } from "@/features/sales-points-of-sale/actions/point-of-sale.action";
import { getCompanyPaymentMethodsAction } from "@/features/companies/actions/companies-payment-methods.action";
import { getPosPaymentMethodsAction, replacePosPaymentMethodsAction } from "@/features/sales-points-of-sale/actions/pos-payment-methods.action";
import type { CompanyPaymentMethodConfig } from "@/features/companies/types/company-payment-methods.types";
import {
  syncPosPaymentDraftWithCatalog,
  type PosPaymentMethodConfig,
} from "@/features/sales-points-of-sale/types/pos-payment-methods.types";
import { getCompanyDetailsAction } from "@/features/settings-company/actions/company.action";
import { getCompanyDeferredPaymentSettingsAction } from "@/features/companies/actions/companies-deferred-payment.action";
import {
  PosPaymentMethodsCardsEditor,
  type PosPaymentMethodsCardsEditorHandle,
} from "./PosPaymentMethodsCardsEditor";
import {
  getPosFiscalPolicyAction,
  getPosFolioAllocationsAction,
  replacePosFiscalPolicyAction,
  getFiscalFolioSummaryAction,
} from "@/features/sales-points-of-sale/actions/pos-fiscal.action";
import { PosFiscalSettingsEditor } from "@/features/sales-points-of-sale/ui/PosFiscalSettingsEditor";
import type { PosFiscalPolicy } from "@/features/sales-points-of-sale/types/pos-fiscal.types";

export type UpdatePointOfSaleDialogProps = {
  open: boolean;
  onClose: () => void;
  point: PointOfSaleListItem;
  onSuccess?: () => void | Promise<void>;
  branches: BranchListItem[];
  priceListCatalog: PriceListListItem[];
  companyId: string | null | undefined;
  storages: StorageListItem[];
};

export function UpdatePointOfSaleDialog({
  open,
  onClose,
  point,
  onSuccess,
  branches,
  priceListCatalog,
  companyId,
  storages,
}: UpdatePointOfSaleDialogProps) {
  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState<string>("");
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
  const [fiscalPolicy, setFiscalPolicy] = useState<PosFiscalPolicy | null>(null);
  const [fiscalAllocationsLoaded, setFiscalAllocationsLoaded] = useState<
    import("@/features/sales-points-of-sale/types/pos-fiscal.types").PosFolioAllocation[]
  >([]);
  const [companyCaf39, setCompanyCaf39] = useState<{
    rangeFrom: number;
    rangeTo: number;
    packageCode?: string;
  } | null>(null);
  const [loadingFiscal, setLoadingFiscal] = useState(false);
  const resolvedCompanyId = (companyId ?? "").trim();

  const branchOptions = useMemo(
    () => branches.map((b) => ({ id: b.id, label: b.name })),
    [branches],
  );

  const hasBranches = branchOptions.length > 0;

  const storeRoomOptions = useMemo(() => {
    return (storages ?? [])
      .filter((s) => s.branchId === branchId && s.type === "STORE" && s.isActive)
      .map((s) => ({ id: s.id, label: s.name }));
  }, [storages, branchId]);

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
    if (isSalePos && loadingFiscal) reasons.push("carga de documentos tributarios");
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
    loadingFiscal,
  ]);

  const canSubmit = submitBlockers.length === 0 && !isPending;

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
    setName(point.name);
    const resolvedBranchId =
      point.branchId && branches.some((b) => b.id === point.branchId)
        ? point.branchId
        : branches[0]?.id ?? "";
    setBranchId(resolvedBranchId);
    const rooms = (storages ?? []).filter(
      (s) => s.branchId === resolvedBranchId && s.type === "STORE" && s.isActive,
    );
    const initialStorage =
      point.storageId && rooms.some((s) => s.id === point.storageId)
        ? point.storageId
        : rooms[0]?.id ?? "";
    setStorageId(initialStorage);
    setDeviceId(
      point.deviceId != null && String(point.deviceId).trim() ? String(point.deviceId) : "",
    );
    setIsActive(point.isActive);
    setPosKind(point.kind ?? "SALE");
    setAcceptsPresaleTickets(Boolean(point.acceptsPresaleTickets));
    setAllowsDeferredPayment(Boolean(point.allowsDeferredPayment));
    setSelectedListIds(
      (point.priceLists && point.priceLists.length > 0
        ? point.priceLists.map((p) => p.id)
        : []),
    );
    setDefaultListId(
      point.defaultPriceListId && point.priceLists?.some((p) => p.id === point.defaultPriceListId)
        ? point.defaultPriceListId
        : null,
    );
    setError(null);

    setPaymentCatalog([]);
    setPosPaymentDraft([]);
    setBankAccountOptions([]);
    setLoadingPayments(false);
    setFiscalPolicy(null);
    setFiscalAllocationsLoaded([]);
    setCompanyCaf39(null);
    setLoadingFiscal(false);
  }, [open, point, branches, storages]);

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
        const [catalogRes, posRes, details] = await Promise.all([
          getCompanyPaymentMethodsAction(resolvedCompanyId),
          getPosPaymentMethodsAction(point.id),
          getCompanyDetailsAction(),
        ]);
        if (cancelled) return;
        if (catalogRes.success) {
          setPaymentCatalog(catalogRes.paymentMethods);
          if (posRes.success) {
            setPosPaymentDraft(
              syncPosPaymentDraftWithCatalog(catalogRes.paymentMethods, posRes.paymentMethods),
            );
          } else {
            setPosPaymentDraft(syncPosPaymentDraftWithCatalog(catalogRes.paymentMethods, []));
          }
        } else if (posRes.success) {
          setPosPaymentDraft(posRes.paymentMethods);
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
  }, [open, resolvedCompanyId, posKind, point.id]);

  useEffect(() => {
    if (!open || posKind !== "SALE") {
      setLoadingFiscal(false);
      return;
    }
    let cancelled = false;
    setLoadingFiscal(true);
    void (async () => {
      try {
        const [policyRes, allocRes, summaryRes] = await Promise.all([
          getPosFiscalPolicyAction(point.id),
          getPosFolioAllocationsAction(point.id),
          getFiscalFolioSummaryAction(),
        ]);
        if (cancelled) return;
        if (policyRes.success) setFiscalPolicy(policyRes.policy);
        const boleta39 = summaryRes.success
          ? summaryRes.summaries.find((s) => s.dteType === 39)?.caf ?? null
          : null;
        setCompanyCaf39(
          boleta39
            ? {
                rangeFrom: boleta39.rangeFrom,
                rangeTo: boleta39.rangeTo,
                packageCode: boleta39.packageCode,
              }
            : null,
        );
        if (allocRes.success) setFiscalAllocationsLoaded(allocRes.allocations);
      } finally {
        if (!cancelled) setLoadingFiscal(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, posKind, point.id]);

  useEffect(() => {
    if (!open) {
      return;
    }
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
  }, [open, branchId, storeRoomOptions]);

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

  const handleClose = () => {
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
        const r = await updatePointOfSaleAction({
          id: point.id,
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
          const paymentPayload =
            paymentEditorRef.current?.getPayload() ?? posPaymentDraft;
          const pr = await replacePosPaymentMethodsAction(point.id, paymentPayload);
          if (!pr.success) {
            setError(pr.error || "No se pudieron guardar los medios de pago del POS.");
            return;
          }

          if (fiscalPolicy) {
            const fp = await replacePosFiscalPolicyAction(point.id, fiscalPolicy);
            if (!fp.success) {
              setError(fp.error || "No se pudo guardar la política fiscal del POS.");
              return;
            }
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
      title="Actualizar punto de venta"
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 640px)"
      data-test-id="pos-update-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="pos-update-error">
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
            data-test-id="pos-update-cancel"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!canSubmit}
            data-test-id="pos-update-submit"
          >
            Actualizar
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Nombre"
          name="pos-update-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
          required
          data-test-id="pos-update-name"
        />
        {hasBranches ? (
          <Select
            label="Sucursal"
            name="pos-update-branch"
            value={branchId}
            onChange={(id) => {
              if (id != null && id !== "") {
                setBranchId(String(id));
              }
            }}
            options={branchOptions}
            placeholder="Sucursal"
            required
            data-test-id="pos-update-branch"
          />
        ) : (
          <p className="text-sm text-muted-foreground" data-test-id="pos-update-branch-hint">
            No hay sucursales disponibles. Crea al menos una en Ajustes → Sucursales.
          </p>
        )}
        {hasBranches ? (
          storeRoomOptions.length === 0 ? (
            <p className="text-sm text-amber-800 dark:text-amber-200">
              No hay almacenes tipo sala de venta en esta sucursal. Créalo en Inventario → Almacenes.
            </p>
          ) : (
            <Select
              label="Sala de venta (stock POS)"
              name="pos-update-storage"
              value={storageId}
              onChange={(id) => {
                if (id != null && id !== "") {
                  setStorageId(String(id));
                }
              }}
              options={storeRoomOptions}
              placeholder="Almacén sala"
              required
              data-test-id="pos-update-storage"
            />
          )
        ) : null}
        <TextField
          label="ID de dispositivo (opcional)"
          name="pos-update-device"
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          placeholder="ID de dispositivo"
          data-test-id="pos-update-device"
        />
        <div className="pt-1">
          <Switch
            checked={isActive}
            onChange={setIsActive}
            label="Punto de venta activo"
            labelPosition="right"
            data-test-id="pos-update-active"
          />
        </div>
        <Select
          label="Tipo de punto"
          name="pos-update-kind"
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
          data-test-id="pos-update-kind"
        />
        {posKind === "SALE" ? (
          <>
            <Switch
              checked={acceptsPresaleTickets}
              onChange={setAcceptsPresaleTickets}
              label="Acepta tickets de preventa"
              labelPosition="right"
              data-test-id="pos-update-accepts-presale"
            />
            <Switch
              checked={allowsDeferredPayment}
              onChange={setAllowsDeferredPayment}
              label="Permite venta sin pago"
              labelPosition="right"
              disabled={!companyDeferredPaymentEnabled}
              data-test-id="pos-update-allows-deferred-payment"
            />
            {!companyDeferredPaymentEnabled ? (
              <p className="text-xs text-muted-foreground">
                Activa «Venta sin pago inmediato» en Configuración → Empresa → Crédito interno.
              </p>
            ) : null}
          </>
        ) : null}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Listas de precio</p>
          <p className="text-xs text-muted-foreground">Marca las listas asociadas a este punto de venta.</p>
          {priceListCatalog.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay listas de precio en el catálogo.</p>
          ) : (
            <ul className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-border p-2">
              {priceListCatalog.map((pl) => (
                <li key={pl.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`pos-update-pl-${pl.id}`}
                    className="h-4 w-4 shrink-0 rounded border-border"
                    checked={selectedListIds.includes(pl.id)}
                    onChange={() => toggleList(pl.id)}
                    data-test-id={`pos-update-pl-${pl.id}`}
                  />
                  <label htmlFor={`pos-update-pl-${pl.id}`} className="min-w-0 flex-1 cursor-pointer text-sm">
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
            name="pos-update-default-list"
            value={defaultListId ?? defaultListOptions[0]?.id}
            onChange={onDefaultListChange}
            options={defaultListOptions}
            required
            placeholder="Elegir lista"
            data-test-id="pos-update-default-list"
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
              key={open ? `pos-pm-editor-${point.id}` : "pos-pm-editor-closed"}
              ref={paymentEditorRef}
              catalog={paymentCatalog}
              value={posPaymentDraft}
              onChange={setPosPaymentDraft}
              bankAccountOptions={bankAccountOptions}
              disabled={isPending || !resolvedCompanyId}
              data-test-id="pos-update-payment-methods"
            />
          )}
        </div>
        ) : null}

        {posKind === "SALE" ? (
          <div className="space-y-2 pt-2">
            <p className="text-sm font-medium text-foreground">Documentos tributarios</p>
            {loadingFiscal || !fiscalPolicy ? (
              <LoadingState
                className="flex items-center justify-center py-4"
                label="Cargando documentos tributarios"
              />
            ) : (
              <PosFiscalSettingsEditor
                posId={point.id}
                initialPolicy={fiscalPolicy}
                initialAllocations={fiscalAllocationsLoaded}
                companyCaf39={companyCaf39}
                disabled={isPending}
                onChange={({ policy }) => {
                  setFiscalPolicy(policy);
                }}
              />
            )}
          </div>
        ) : null}
        {!canSubmit && submitBlockers.length > 0 ? (
          <p className="text-sm text-muted-foreground" data-test-id="pos-update-submit-hint">
            Para guardar completa: {submitBlockers.join(", ")}.
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
