"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";
import { searchPosProductsAction } from "@/features/pos-products/actions/pos-products.action";
import { formatMoney } from "@/features/pos-products/ui/posProductPreview";
import { listLaundryCatalogAction } from "@/features/laundry/actions/laundry.action";
import { LAUNDRY_PAYMENT_MODE_OPTIONS } from "@/features/laundry/lib/laundry-payment-mode-label";
import {
  readLaundryReceptionDraft,
  writeLaundryReceptionDraft,
  type LaundryDraftGarment,
} from "@/features/laundry/lib/laundry-reception-draft-storage";
import {
  paymentModeToPendingCharge,
  resolvePendingExpectedPaidTotal,
  type LaundryPendingCheckout,
} from "@/features/laundry/lib/laundry-pending-checkout";
import { useStartLaundryPendingCheckout } from "@/features/laundry/lib/use-start-laundry-pending-checkout";
import LaundryQualityStars, {
  LAUNDRY_QUALITY_ATTRIBUTE_CODE,
} from "@/features/laundry/ui/LaundryQualityStars";
import type {
  LaundryCatalogBundle,
  LaundryGarmentAttributeValueSnapshot,
  LaundryPaymentMode,
} from "@/features/laundry/types/laundry.types";
import {
  POS_CONTEXT_CHANGED_EVENT,
  patchPosContextClient,
  readPosContextClient,
  type PosPriceListSnapshot,
} from "@/features/session/lib/pos-context-storage";
import {
  Alert,
  Button,
  Dialog,
  DotProgress,
  IconButton,
  NumberStepper,
  Select,
  TextField,
} from "@kai/ui";

type DraftGarment = LaundryDraftGarment;

type ServiceOption = {
  id: string;
  label: string;
  item: PosProductSearchItem;
};

function newKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `k-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function emptyGarment(garmentTypeId: string): DraftGarment {
  return {
    key: newKey(),
    garmentTypeId,
    quantity: 1,
    attributeValues: {},
    selectedCareTemplateIds: [],
    careInstructions: "",
    customerNotes: "",
    serviceLines: [],
  };
}

function computeGarmentServicesTotal(garment: DraftGarment): number {
  const garmentQty = Math.max(0, Number(garment.quantity) || 0);
  const servicesUnitTotal = garment.serviceLines.reduce(
    (sum, line) => sum + Math.round(line.quantity * line.unitPrice),
    0,
  );
  return Math.round(garmentQty * servicesUnitTotal);
}

function serviceOptionLabel(item: PosProductSearchItem): string {
  const attrs = item.attributes?.map((a) => a.attributeValue).filter(Boolean).join(" ");
  const name = [item.productName, attrs].filter(Boolean).join(" · ") || item.productName;
  return `${name} — ${formatMoney(item.unitPrice)}`;
}

export default function LaundryReceptionWorkspace() {
  const router = useRouter();
  const { startPendingCheckout, busy: checkoutBusy } = useStartLaundryPendingCheckout();
  const [contextReady, setContextReady] = useState(false);
  const [branchId, setBranchId] = useState("");
  const [pointOfSaleId, setPointOfSaleId] = useState("");
  const [priceListId, setPriceListId] = useState("");
  const [priceListOptions, setPriceListOptions] = useState<PosPriceListSnapshot[]>([]);

  const [catalog, setCatalog] = useState<LaundryCatalogBundle | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [garments, setGarments] = useState<DraftGarment[]>([]);
  const [selectedGarmentKey, setSelectedGarmentKey] = useState<string | null>(null);
  /** Mobile: solo una card expandida (edición); el resto en resumen solo lectura. */
  const [expandedGarmentKey, setExpandedGarmentKey] = useState<string | null>(null);
  const [draftHydrated, setDraftHydrated] = useState(false);

  const [paymentMode, setPaymentMode] = useState<LaundryPaymentMode>("FULL_ON_PICKUP");
  const [depositAmount, setDepositAmount] = useState(0);
  const [promisedAtLocal, setPromisedAtLocal] = useState("");
  const [notes, setNotes] = useState("");

  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [servicePickerGarmentKey, setServicePickerGarmentKey] = useState<string | null>(null);
  const [servicePickerQuery, setServicePickerQuery] = useState("");

  const [submitError, setSubmitError] = useState<string | null>(null);

  const serviceNamesByVariantId = useRef<Record<string, string>>({});
  const skipNextPersistRef = useRef(true);

  const syncContext = useCallback(() => {
    const ctx = readPosContextClient();
    setBranchId(ctx?.branchId?.trim() ?? "");
    setPointOfSaleId(ctx?.pointOfSaleId?.trim() ?? "");
    setPriceListId(ctx?.priceListId?.trim() ?? "");
    setPriceListOptions(Array.isArray(ctx?.priceLists) ? ctx!.priceLists! : []);
    setContextReady(true);
  }, []);

  useEffect(() => {
    syncContext();
    window.addEventListener(POS_CONTEXT_CHANGED_EVENT, syncContext);
    return () => window.removeEventListener(POS_CONTEXT_CHANGED_EVENT, syncContext);
  }, [syncContext]);

  useEffect(() => {
    const draft = readLaundryReceptionDraft();
    if (draft) {
      setGarments(draft.garments);
      setSelectedGarmentKey(draft.selectedGarmentKey);
      setExpandedGarmentKey(draft.selectedGarmentKey);
      setPaymentMode(draft.paymentMode || "FULL_ON_PICKUP");
      setDepositAmount(Number(draft.depositAmount) || 0);
      setPromisedAtLocal(draft.promisedAtLocal || "");
      setNotes(draft.notes || "");
      if (draft.priceListId?.trim()) {
        setPriceListId(draft.priceListId.trim());
        patchPosContextClient({ priceListId: draft.priceListId.trim() });
      }
      for (const g of draft.garments) {
        for (const line of g.serviceLines) {
          serviceNamesByVariantId.current[line.productVariantId] = line.productName;
        }
      }
    }
    setDraftHydrated(true);
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;
    let cancelled = false;
    void (async () => {
      setCatalogLoading(true);
      setCatalogError(null);
      const res = await listLaundryCatalogAction();
      if (cancelled) return;
      setCatalogLoading(false);
      if (!res.success) {
        setCatalogError(res.message);
        return;
      }
      setCatalog(res.catalog);
      if (res.catalog.garmentTypes.length > 0) {
        setGarments((prev) => {
          if (prev.length > 0) return prev;
          const first = emptyGarment(res.catalog.garmentTypes[0].id);
          setSelectedGarmentKey(first.key);
          setExpandedGarmentKey(first.key);
          return [first];
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [draftHydrated]);

  useEffect(() => {
    if (!priceListId.trim() || !branchId.trim()) {
      setServiceOptions([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      setServicesLoading(true);
      setServicesError(null);
      const res = await searchPosProductsAction({
        query: "",
        priceListId,
        branchId,
        pointOfSaleId: pointOfSaleId || null,
        productTypes: ["SERVICE"],
        page: 1,
        pageSize: 100,
      });
      if (cancelled) return;
      setServicesLoading(false);
      if (!res.success) {
        setServicesError(res.message);
        setServiceOptions([]);
        return;
      }
      setServiceOptions(
        res.products.map((item) => ({
          id: item.variantId,
          label: serviceOptionLabel(item),
          item,
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [priceListId, branchId, pointOfSaleId]);

  useEffect(() => {
    if (!draftHydrated) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      writeLaundryReceptionDraft({
        garments,
        selectedGarmentKey,
        selectedCustomer: null,
        paymentMode,
        depositAmount,
        promisedAtLocal,
        notes,
        priceListId: priceListId || undefined,
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [
    draftHydrated,
    garments,
    selectedGarmentKey,
    paymentMode,
    depositAmount,
    promisedAtLocal,
    notes,
    priceListId,
  ]);

  const servicesTotal = useMemo(
    () => garments.reduce((sum, g) => sum + computeGarmentServicesTotal(g), 0),
    [garments],
  );

  const filteredServiceOptions = useMemo(() => {
    const q = servicePickerQuery.trim().toLowerCase();
    if (!q) return serviceOptions;
    return serviceOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [serviceOptions, servicePickerQuery]);

  const closeServicePicker = useCallback(() => {
    setServicePickerGarmentKey(null);
    setServicePickerQuery("");
  }, []);

  const addServiceToGarment = useCallback((garmentKey: string, item: PosProductSearchItem) => {
    serviceNamesByVariantId.current[item.variantId] =
      [item.productName, item.attributes?.map((a) => a.attributeValue).join(" ")]
        .filter(Boolean)
        .join(" ") || item.productName;
    setGarments((prev) =>
      prev.map((g) => {
        if (g.key !== garmentKey) return g;
        const existing = g.serviceLines.find((l) => l.productVariantId === item.variantId);
        if (existing) {
          return {
            ...g,
            serviceLines: g.serviceLines.map((l) =>
              l.key === existing.key ? { ...l, quantity: l.quantity + 1 } : l,
            ),
          };
        }
        return {
          ...g,
          serviceLines: [
            ...g.serviceLines,
            {
              key: newKey(),
              productVariantId: item.variantId,
              productName: item.productName,
              quantity: 1,
              unitPrice: item.unitPrice,
            },
          ],
        };
      }),
    );
    setSubmitError(null);
  }, []);

  const addGarment = () => {
    const defaultTypeId = catalog?.garmentTypes[0]?.id;
    if (!defaultTypeId) {
      setSubmitError("No hay tipos de prenda configurados.");
      return;
    }
    const garment = emptyGarment(defaultTypeId);
    setGarments((prev) => [...prev, garment]);
    setSelectedGarmentKey(garment.key);
    setExpandedGarmentKey(garment.key);
  };

  const removeGarment = (key: string) => {
    setGarments((prev) => {
      const next = prev.filter((g) => g.key !== key);
      if (selectedGarmentKey === key) {
        setSelectedGarmentKey(next[0]?.key ?? null);
      }
      if (expandedGarmentKey === key) {
        setExpandedGarmentKey(next[0]?.key ?? null);
      }
      return next;
    });
  };

  const updateGarment = (key: string, patch: Partial<DraftGarment>) => {
    setGarments((prev) => prev.map((g) => (g.key === key ? { ...g, ...patch } : g)));
  };

  const toggleCareTemplate = (garmentKey: string, templateId: string, text: string) => {
    setGarments((prev) =>
      prev.map((g) => {
        if (g.key !== garmentKey) return g;
        const selected = new Set(g.selectedCareTemplateIds);
        let careInstructions = g.careInstructions.trim();
        if (selected.has(templateId)) {
          selected.delete(templateId);
          careInstructions = careInstructions
            .split("\n")
            .filter((line) => line.trim() !== text.trim())
            .join("\n")
            .trim();
        } else {
          selected.add(templateId);
          careInstructions = [careInstructions, text.trim()].filter(Boolean).join("\n");
        }
        return {
          ...g,
          selectedCareTemplateIds: [...selected],
          careInstructions,
        };
      }),
    );
  };

  const buildAttributeSnapshots = (
    garment: DraftGarment,
  ): LaundryGarmentAttributeValueSnapshot[] => {
    const attrs = catalog?.attributes ?? [];
    const snapshots: LaundryGarmentAttributeValueSnapshot[] = [];
    for (const [attributeId, valueId] of Object.entries(garment.attributeValues)) {
      if (!attributeId || !valueId) continue;
      const attr = attrs.find((a) => a.id === attributeId);
      const value = attr?.values.find((v) => v.id === valueId);
      const snapshot: LaundryGarmentAttributeValueSnapshot = {
        attributeId,
        valueId,
      };
      if (attr?.code) snapshot.attributeCode = attr.code;
      if (value?.label) snapshot.label = value.label;
      snapshots.push(snapshot);
    }
    return snapshots;
  };

  const validateGarmentsStep = (): string | null => {
    if (!branchId.trim()) return "Configurá la sucursal en el POS.";
    if (garments.length === 0) return "Agregá al menos una prenda.";
    for (const garment of garments) {
      if (!garment.garmentTypeId) return "Cada prenda debe tener un tipo.";
      if (garment.quantity <= 0) return "La cantidad de cada prenda debe ser mayor a cero.";
      if (garment.serviceLines.length === 0) {
        return "Cada prenda debe tener al menos un servicio.";
      }
    }
    if (paymentMode === "DEPOSIT_THEN_BALANCE" && depositAmount <= 0) {
      return "Indicá el monto del abono.";
    }
    return null;
  };

  const garmentsStepReady = useMemo(() => {
    if (!branchId.trim() || garments.length === 0) return false;
    for (const garment of garments) {
      if (!garment.garmentTypeId) return false;
      if (garment.quantity <= 0) return false;
      if (garment.serviceLines.length === 0) return false;
    }
    if (paymentMode === "DEPOSIT_THEN_BALANCE" && depositAmount <= 0) return false;
    return true;
  }, [branchId, garments, paymentMode, depositAmount]);

  const goToPayment = async () => {
    const err = validateGarmentsStep();
    if (err) {
      setSubmitError(err);
      return;
    }
    setSubmitError(null);

    const charge = paymentModeToPendingCharge(paymentMode);
    const pending: LaundryPendingCheckout = {
      paymentMode,
      depositAmount,
      servicesTotal,
      charge,
      expectedPaidTotal: resolvePendingExpectedPaidTotal(charge, servicesTotal, depositAmount),
      promisedAtLocal: promisedAtLocal.trim() || undefined,
      notes: notes.trim() || undefined,
      branchId: branchId.trim(),
      pointOfSaleId: pointOfSaleId.trim() || undefined,
      garments: garments.map((g) => {
        const type = catalog?.garmentTypes.find((t) => t.id === g.garmentTypeId);
        return {
          key: g.key,
          garmentTypeId: g.garmentTypeId,
          garmentTypeName: type?.name?.trim() || "Prenda",
          quantity: g.quantity,
          attributeValues: buildAttributeSnapshots(g),
          careInstructions: g.careInstructions.trim() || undefined,
          customerNotes: g.customerNotes.trim() || undefined,
          serviceLines: g.serviceLines.map((line) => ({
            productVariantId: line.productVariantId,
            productName: line.productName,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            notes: line.notes?.trim() || undefined,
          })),
          subtotal: computeGarmentServicesTotal(g),
        };
      }),
    };

    const res = await startPendingCheckout(pending);
    if (!res.ok) {
      setSubmitError(res.message);
    }
  };

  const onPriceListChange = (id: string) => {
    setPriceListId(id);
    patchPosContextClient({ priceListId: id });
  };

  if (!contextReady || !draftHydrated || catalogLoading) {
    return (
      <div className="flex min-h-[12rem] items-center justify-center" data-test-id="laundry-workspace-loading">
        <DotProgress />
      </div>
    );
  }

  if (!branchId.trim()) {
    return (
      <p className="text-sm text-muted-foreground" data-test-id="laundry-workspace-no-branch">
        Configurá la caja / sucursal para crear recepciones.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4" data-test-id="laundry-reception-workspace">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Nueva guía de lavandería
        </h1>
        <Button
          type="button"
          variant="outlined"
          onClick={() => router.push("/laundry/receptions")}
          data-test-id="laundry-workspace-back"
        >
          Ver listado
        </Button>
      </div>

      {catalogError ? (
        <Alert variant="error" data-test-id="laundry-workspace-catalog-error">
          {catalogError}
        </Alert>
      ) : null}

      {servicesError ? (
        <Alert variant="error" data-test-id="laundry-workspace-services-error">
          {servicesError}
        </Alert>
      ) : null}

      {submitError ? (
        <Alert variant="error" data-test-id="laundry-workspace-submit-error">
          {submitError}
        </Alert>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-3" data-test-id="laundry-workspace-garments-step">
          <section className="min-h-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <IconButton
                icon="Plus"
                variant="action"
                size="sm"
                ariaLabel="Agregar prenda"
                title="Agregar prenda"
                onClick={addGarment}
                data-test-id="laundry-workspace-add-garment"
              />
              <h2 className="text-sm font-semibold text-foreground">Prendas</h2>
              {priceListOptions.length > 0 ? (
                <div className="ml-auto min-w-[10rem]">
                  <Select
                    label="Lista de precios"
                    value={priceListId || null}
                    onChange={(id) => onPriceListChange(id ? String(id) : "")}
                    options={priceListOptions.map((pl) => ({
                      id: pl.id,
                      label: pl.name,
                    }))}
                    data-test-id="laundry-workspace-price-list"
                  />
                </div>
              ) : null}
            </div>

            <div
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2 sm:hidden"
              data-test-id="laundry-workspace-garments-total-top"
            >
              <span className="text-base font-semibold text-foreground">Total</span>
              <span
                className="text-xl font-bold tabular-nums text-foreground"
                data-test-id="laundry-workspace-garments-total"
              >
                {formatMoney(servicesTotal)}
              </span>
            </div>

            <div className="grid max-h-[calc(100dvh-var(--app-topbar-height,3.75rem)-14rem)] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
              {garments.map((garment, index) => {
                const type = catalog?.garmentTypes.find((t) => t.id === garment.garmentTypeId);
                const selected = garment.key === selectedGarmentKey;
                const expanded = garment.key === expandedGarmentKey;
                const attrSummary = (catalog?.attributes ?? [])
                  .map((attr) => {
                    const valueId = garment.attributeValues[attr.id];
                    if (!valueId) return null;
                    const value = attr.values.find((v) => v.id === valueId);
                    return value?.label?.trim() || null;
                  })
                  .filter(Boolean) as string[];
                const servicesSummary =
                  garment.serviceLines.length === 0
                    ? "Sin servicios"
                    : garment.serviceLines.map((l) => l.productName).join(", ");
                const toggleExpanded = () => {
                  setSelectedGarmentKey(garment.key);
                  setExpandedGarmentKey((prev) =>
                    prev === garment.key ? null : garment.key,
                  );
                };
                return (
                  <div
                    key={garment.key}
                    className={`flex h-full min-w-0 flex-col rounded-xl border bg-card p-3 shadow-sm ${
                      selected || expanded
                        ? "border-primary ring-1 ring-primary/30"
                        : "border-border"
                    }`}
                    data-test-id={`laundry-workspace-garment-${index}`}
                    data-expanded={expanded ? "true" : "false"}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-0.5">
                        <span className="sm:hidden">
                          <IconButton
                            icon={expanded ? "ChevronDown" : "ChevronRight"}
                            variant="action"
                            size="sm"
                            ariaLabel={expanded ? "Contraer prenda" : "Expandir prenda"}
                            onClick={toggleExpanded}
                            data-test-id={`laundry-workspace-garment-toggle-${index}`}
                          />
                        </span>
                        <button
                          type="button"
                          className="min-w-0 flex-1 truncate text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:pointer-events-none"
                          onClick={toggleExpanded}
                        >
                          Prenda {index + 1}
                          {type?.name ? ` · ${type.name}` : ""}
                        </button>
                      </div>
                      {garments.length > 1 ? (
                        <IconButton
                          icon="Trash2"
                          variant="action"
                          size="sm"
                          ariaLabel="Eliminar prenda"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeGarment(garment.key);
                          }}
                          data-test-id={`laundry-workspace-remove-garment-${index}`}
                        />
                      ) : null}
                    </div>

                    {/* Mobile: resumen solo lectura cuando está colapsada */}
                    {!expanded ? (
                      <button
                        type="button"
                        className="space-y-1 rounded-lg bg-muted/30 px-2.5 py-2 text-left sm:hidden"
                        onClick={toggleExpanded}
                        data-test-id={`laundry-workspace-garment-summary-${index}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {type?.name?.trim() || "Prenda"} × {garment.quantity}
                          </p>
                          <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                            {formatMoney(computeGarmentServicesTotal(garment))}
                          </span>
                        </div>
                        {attrSummary.length > 0 ? (
                          <p className="truncate text-[11px] text-muted-foreground">
                            {attrSummary.join(" · ")}
                          </p>
                        ) : null}
                        <p className="truncate text-[11px] text-muted-foreground">
                          {servicesSummary}
                        </p>
                        {garment.customerNotes?.trim() ? (
                          <p className="truncate text-[11px] italic text-muted-foreground">
                            {garment.customerNotes.trim()}
                          </p>
                        ) : null}
                      </button>
                    ) : null}

                    <div
                      className={`space-y-2 ${expanded ? "block" : "hidden"} sm:block`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <Select
                          label="Tipo"
                          value={garment.garmentTypeId || null}
                          onChange={(id) =>
                            updateGarment(garment.key, { garmentTypeId: id ? String(id) : "" })
                          }
                          options={(catalog?.garmentTypes ?? []).map((t) => ({
                            id: t.id,
                            label: t.name,
                          }))}
                        />
                        <NumberStepper
                          value={garment.quantity}
                          min={1}
                          onChange={(value) => updateGarment(garment.key, { quantity: value })}
                        />
                      </div>

                      {(() => {
                        const attrs = catalog?.attributes ?? [];
                        const colorAttr = attrs.find((a) => a.code === "COLOR");
                        const sizeAttr = attrs.find((a) => a.code === "TALLA");
                        const otherAttrs = attrs.filter(
                          (a) => a.code !== "COLOR" && a.code !== "TALLA",
                        );
                        const setAttrValue = (attributeId: string, valueId: string | null) => {
                          updateGarment(garment.key, {
                            attributeValues: {
                              ...garment.attributeValues,
                              [attributeId]: valueId ?? "",
                            },
                          });
                        };
                        return (
                          <>
                            {colorAttr || sizeAttr ? (
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {colorAttr ? (
                                  <Select
                                    label={colorAttr.name}
                                    value={garment.attributeValues[colorAttr.id] ?? null}
                                    onChange={(id) =>
                                      setAttrValue(colorAttr.id, id ? String(id) : null)
                                    }
                                    allowClear
                                    options={colorAttr.values
                                      .filter((v) => v.active)
                                      .map((v) => ({ id: v.id, label: v.label }))}
                                  />
                                ) : null}
                                {sizeAttr ? (
                                  <Select
                                    label={sizeAttr.name}
                                    value={garment.attributeValues[sizeAttr.id] ?? null}
                                    onChange={(id) =>
                                      setAttrValue(sizeAttr.id, id ? String(id) : null)
                                    }
                                    allowClear
                                    options={sizeAttr.values
                                      .filter((v) => v.active)
                                      .map((v) => ({ id: v.id, label: v.label }))}
                                  />
                                ) : null}
                              </div>
                            ) : null}

                            {otherAttrs.map((attr) => {
                              if (attr.code === LAUNDRY_QUALITY_ATTRIBUTE_CODE) {
                                return (
                                  <LaundryQualityStars
                                    key={attr.id}
                                    label={attr.name}
                                    values={attr.values}
                                    valueId={garment.attributeValues[attr.id] || null}
                                    onChange={(valueId) => setAttrValue(attr.id, valueId)}
                                    data-test-id={`laundry-workspace-quality-${index}`}
                                  />
                                );
                              }
                              return (
                                <Select
                                  key={attr.id}
                                  label={attr.name}
                                  value={garment.attributeValues[attr.id] ?? null}
                                  onChange={(id) =>
                                    setAttrValue(attr.id, id ? String(id) : null)
                                  }
                                  allowClear
                                  options={attr.values
                                    .filter((v) => v.active)
                                    .map((v) => ({ id: v.id, label: v.label }))}
                                />
                              );
                            })}
                          </>
                        );
                      })()}

                      {(catalog?.careTemplates ?? []).length > 0 ? (
                        <div>
                          <p className="mb-1 text-xs font-medium text-muted-foreground">
                            Instrucciones de cuidado
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {(catalog?.careTemplates ?? []).map((tpl) => {
                              const active = garment.selectedCareTemplateIds.includes(tpl.id);
                              return (
                                <button
                                  key={tpl.id}
                                  type="button"
                                  className={`rounded-full border px-2 py-0.5 text-xs ${
                                    active
                                      ? "border-primary bg-primary/10 text-primary"
                                      : "border-border text-muted-foreground"
                                  }`}
                                  onClick={() =>
                                    toggleCareTemplate(garment.key, tpl.id, tpl.text || tpl.label)
                                  }
                                >
                                  {tpl.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}

                      <TextField
                        label="Notas del cliente"
                        placeholder="Notas del cliente"
                        value={garment.customerNotes}
                        onChange={(e) =>
                          updateGarment(garment.key, { customerNotes: e.target.value })
                        }
                      />

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-muted-foreground">Servicios</p>
                          <Button
                            type="button"
                            variant="outlined"
                            size="sm"
                            disabled={servicesLoading || serviceOptions.length === 0}
                            onClick={() => {
                              setServicePickerQuery("");
                              setServicePickerGarmentKey(garment.key);
                            }}
                            data-test-id={`laundry-workspace-add-service-${index}`}
                          >
                            Agregar servicio
                          </Button>
                        </div>

                        {garment.serviceLines.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            Elegí al menos un servicio para esta prenda.
                          </p>
                        ) : (
                          garment.serviceLines.map((line) => (
                            <div
                              key={line.key}
                              className="flex items-center justify-between gap-2 rounded-md border border-border/70 px-2 py-1 text-sm"
                            >
                              <span className="min-w-0 truncate">{line.productName}</span>
                              <span className="shrink-0 text-muted-foreground">
                                {garment.quantity > 1
                                  ? `${garment.quantity} × ${line.quantity} × ${formatMoney(line.unitPrice)}`
                                  : `${line.quantity} × ${formatMoney(line.unitPrice)}`}
                              </span>
                              <IconButton
                                icon="Trash2"
                                variant="action"
                                size="sm"
                                ariaLabel="Quitar servicio"
                                onClick={() =>
                                  updateGarment(garment.key, {
                                    serviceLines: garment.serviceLines.filter(
                                      (l) => l.key !== line.key,
                                    ),
                                  })
                                }
                              />
                            </div>
                          ))
                        )}
                      </div>

                      <div className="flex justify-end text-xs text-muted-foreground">
                        Subtotal:{" "}
                        <span className="ml-1 font-medium text-foreground">
                          {formatMoney(computeGarmentServicesTotal(garment))}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <footer
            className="shrink-0 space-y-3 border-t border-border pt-3"
            data-test-id="laundry-workspace-garments-footer"
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Select
                  label="Modo de pago"
                  value={paymentMode}
                  onChange={(id) =>
                    setPaymentMode(String(id ?? "FULL_ON_PICKUP") as LaundryPaymentMode)
                  }
                  options={LAUNDRY_PAYMENT_MODE_OPTIONS.map((opt) => ({
                    id: opt.value,
                    label: opt.label,
                  }))}
                  data-test-id="laundry-workspace-payment-mode"
                />
                <p
                  className="text-xs text-muted-foreground"
                  data-test-id="laundry-workspace-payment-mode-hint"
                >
                  {paymentMode === "FULL_ON_PICKUP"
                    ? "Al continuar solo confirmás la recepción (sin cobro ahora)."
                    : "Al continuar vas a cobro en la pantalla de pago."}
                </p>
              </div>
              {paymentMode === "DEPOSIT_THEN_BALANCE" ? (
                <NumberStepper
                  label="Abono"
                  value={depositAmount}
                  min={0}
                  onChange={setDepositAmount}
                  data-test-id="laundry-workspace-deposit"
                />
              ) : (
                <TextField
                  label="Fecha prometida"
                  type="datetime-local"
                  value={promisedAtLocal}
                  onChange={(e) => setPromisedAtLocal(e.target.value)}
                  data-test-id="laundry-workspace-promised-at"
                />
              )}
            </div>
            {paymentMode === "DEPOSIT_THEN_BALANCE" ? (
              <TextField
                label="Fecha prometida"
                type="datetime-local"
                value={promisedAtLocal}
                onChange={(e) => setPromisedAtLocal(e.target.value)}
                data-test-id="laundry-workspace-promised-at"
              />
            ) : null}
            <TextField
              label="Notas generales"
              placeholder="Notas generales"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              data-test-id="laundry-workspace-notes"
            />
            <div className="flex items-center justify-between gap-3">
              <div className="hidden min-w-0 flex-1 sm:block">
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xl font-bold text-foreground sm:text-2xl">Total</span>
                  <span
                    className="text-3xl font-bold tabular-nums text-foreground sm:text-4xl"
                    data-test-id="laundry-workspace-garments-total-desktop"
                  >
                    {formatMoney(servicesTotal)}
                  </span>
                </div>
              </div>
              <IconButton
                icon="WashingMachine"
                variant="outlined"
                size="lg"
                className="mx-6 shrink-0 sm:mx-6 max-sm:ml-auto"
                ariaLabel="Ir a recepción"
                title={
                  garmentsStepReady
                    ? "Ir a recepción"
                    : "Completá prendas, servicios y modo de pago"
                }
                disabled={!garmentsStepReady || checkoutBusy}
                isLoading={checkoutBusy}
                onClick={() => void goToPayment()}
                data-test-id="laundry-workspace-to-payment"
              />
            </div>
          </footer>
      </div>

      <Dialog
        open={servicePickerGarmentKey != null}
        onClose={closeServicePicker}
        title="Agregar servicio"
        size="md"
        scroll="paper"
        maxHeight="85vh"
        data-test-id="laundry-workspace-service-picker-dialog"
      >
        <div className="grid gap-3">
          <TextField
            label="Buscar"
            name="laundry-service-picker-search"
            value={servicePickerQuery}
            onChange={(e) => setServicePickerQuery(e.target.value)}
            placeholder="Nombre del servicio…"
            alwaysShowLabel
            data-test-id="laundry-workspace-service-picker-search"
          />

          <div className="max-h-[min(16rem,45vh)] space-y-2 overflow-y-auto" aria-busy={servicesLoading}>
            {servicesLoading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <DotProgress />
                Cargando servicios…
              </p>
            ) : serviceOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay servicios disponibles.</p>
            ) : filteredServiceOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin coincidencias.</p>
            ) : (
              filteredServiceOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className="block w-full rounded-lg border border-border px-3 py-2 text-left text-sm hover:border-primary/40 hover:bg-primary/5"
                  onClick={() => {
                    if (!servicePickerGarmentKey) return;
                    addServiceToGarment(servicePickerGarmentKey, opt.item);
                    closeServicePicker();
                  }}
                  data-test-id={`laundry-workspace-service-pick-${opt.id}`}
                >
                  <span className="font-medium">{opt.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
