"use client";
import { LoadingState } from "@kai/ui";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AutoComplete,
  Button,
  Dialog,
  IconButton,
  NumberStepper,
  PrintDialog,
  Select,
  Switch,
  TextField,
  usePrint,
  type Option,
} from "@kai/ui";
import type { PurchasingVariantSearchItem, PurchasingVariantSearchResult } from "@/features/purchasing-document/types/purchasing-document.types";
import type { SupplierGridRow } from "@/features/purchasing-suppliers/types/supplier.types";
import type { StorageListItem } from "@/features/inventory-storages/types/storage.types";
import type { TaxListItem } from "@/features/accounting-taxes/types/tax.types";
import type {
  CreatePurchaseOrderInput,
  CreatePurchaseOrderResult,
} from "@/features/purchasing-document/types/purchase-order.types";
import type { CreatePurchaseOrderLineInput } from "@/features/purchasing-document/types/purchase-order.types";
import type {
  CreateDirectReceptionInput,
  CreateReceptionResult,
  ReceptionDteType,
  ReceptionDetailForReturn,
  ReceptionFetchResult,
} from "@/features/receptions/types/reception.types";
import type {
  CreatePurchaseReturnInput,
  CreatePurchaseReturnResult,
} from "@/features/purchasing-purchase-returns/types/purchase-return.types";
import type {
  PurchasingTransactionDetail,
  PurchasingTransactionDetailResult,
} from "@/features/purchasing-document/types/purchasing-detail.types";
import {
  formatReceptionPaymentSummary,
  type ReceptionSupplierDocumentPaymentPayload,
} from "@/features/receptions/types/reception-document-payment.types";
import { getCompanyDetailsAction } from "@/features/settings-company/actions/company.action";
import type { CompanyDetails, CompanyBankAccountItem } from "@/features/settings-branches/infrastructure/company.request";
import { formatMoney, InlineSepDot, ProductNameWithAttributes } from "./PurchaseDocumentProductPreview";
import { PurchaseDocumentVariantSearchPanel } from "./PurchaseDocumentVariantSearchPanel";
import { usePurchaseDocumentReferenceData } from "./usePurchaseDocumentReferenceData";
import {
  PurchaseOrderPrintDocument,
  type PurchaseOrderPrintModel,
} from "@/shared/components/PrintDocuments/PurchaseOrderPrintDocument";
import type { SupplierPrintSummaryModel } from "@/shared/components/PrintDocuments/SupplierPrintSummaryBlock";
import { ReceptionPrintDocument } from "@/shared/components/PrintDocuments/ReceptionPrintDocument";
import { buildSupplierIdentityPrintFields } from "@/shared/components/PrintDocuments/supplierPrintIdentity";
import type { PrintableCompanyInfo } from "@/shared/components/PrintDocuments/PrintableDocumentLayout";
import type { CashHubRow } from "@/features/treasury-cash-hubs/types/cash-hub.types";
import { PurchaseDocumentReceptionPaymentDialog } from "./PurchaseDocumentReceptionPaymentDialog";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PurchaseDocumentMode = "reception" | "purchase_order" | "purchase_return";

export type PurchaseDocumentFieldDensity = "default" | "compact";

export type PurchaseDocumentLine = {
  key: string;
  productId: string;
  variantId: string;
  productName: string;
  sku: string;
  barcode: string | null;
  /** Valores de atributos de la variante (solo valores, sin nombre de atributo en UI). */
  attributeValues: Record<string, string>;
  /** Símbolo o nombre de la unidad de compra de la variante (p. ej. L, caja). */
  purchaseUnitLabel?: string | null;
  /** Etiqueta de la unidad base de stock (p. ej. u, ml). */
  stockBaseUnitLabel?: string | null;
  /** Unidades de stock base por 1 unidad de compra. */
  stockQtyPerPurchaseUnit?: number;
  quantity: number;
  unitPrice: number;
  taxIds: string[];
  /** Tope de cantidad a devolver (desde línea de recepción). */
  maxReturnQuantity?: number | null;
};

/** Referencias estables cuando `reference` aún no está listo (evita bucles de efectos en hijos). */
const EMPTY_SUPPLIER_LIST: SupplierGridRow[] = [];
const EMPTY_STORAGE_LIST: StorageListItem[] = [];
const EMPTY_TAX_LIST: TaxListItem[] = [];
const EMPTY_COMPANY_BANKS: CompanyBankAccountItem[] = [];
const EMPTY_CASH_HUB_LIST: CashHubRow[] = [];

export type PurchaseDocumentBuilderProps = {
  mode: PurchaseDocumentMode;
  variantSearch: PurchasingVariantSearchResult;
  searchQuery: string;
  searchPage: number;
  /** Si se define, muestra botón atrás hacia el listado (p. ej. recepciones u órdenes). */
  backToListHref?: string;
  /** Modo orden de compra: crea transacción `PURCHASE_ORDER` en el API. */
  onSavePurchaseOrder?: (input: CreatePurchaseOrderInput) => Promise<CreatePurchaseOrderResult>;
  /** Modo recepción: `POST /receptions/direct` con DTE en metadata de la transacción de ingreso. */
  onSaveReception?: (input: CreateDirectReceptionInput) => Promise<CreateReceptionResult>;
  /** Modo devolución: crea `PURCHASE_RETURN` (sin panel de búsqueda de variantes). */
  onSavePurchaseReturn?: (input: CreatePurchaseReturnInput) => Promise<CreatePurchaseReturnResult>;
  fetchReceptionDetail?: (receptionId: string) => Promise<ReceptionFetchResult>;
  resolveReceptionBySupplierDocument?: (
    supplierId: string,
    documentRef: string,
  ) => Promise<ReceptionFetchResult>;
  /** Devolución: folio interno de recepción, factura o boleta → líneas de la recepción asociada. */
  resolveReceptionForReturn?: (
    source: "reception" | "invoice" | "receipt",
    folio: string,
    supplierId?: string | null,
  ) => Promise<ReceptionFetchResult>;
  /** Modo recepción: detalle de transacción `PURCHASE_ORDER` para cargar líneas. */
  fetchPurchaseOrderDetail?: (transactionId: string) => Promise<PurchasingTransactionDetailResult>;
  /** Modo recepción: búsqueda de OC por folio o texto. */
  searchPurchaseOrders?: (
    query: string,
  ) => Promise<{ rows: Array<{ id: string; documentNumber: string }> }>;
  /** Proveedor, fecha, bodega, DTE, referencia (cabecera). Por defecto no compact. */
  fieldDensity?: PurchaseDocumentFieldDensity;
};

function supplierLabel(s: SupplierGridRow): string {
  const a = s.alias?.trim();
  if (a) {
    return a;
  }
  const p = s.person;
  if (!p) {
    return s.id;
  }
  if (p.type === "COMPANY" && p.businessName?.trim()) {
    return p.businessName.trim();
  }
  const parts = [p.firstName, p.lastName].filter(Boolean);
  const joined = parts.join(" ").trim();
  return joined || s.id;
}

function purchaseOrderFolioLabel(detail: PurchasingTransactionDetail): string {
  const num = detail.documentNumber?.trim();
  if (num && num !== "—") {
    return num;
  }
  const folio = detail.documentFolio?.trim();
  return folio || detail.id;
}

function mapPurchaseOrderLinesToDocumentLines(
  poLines: PurchasingTransactionDetail["lines"],
): PurchaseDocumentLine[] {
  const rows = poLines.filter((l) => (Number(l.quantity) || 0) > 0);
  return rows.map((l) => {
    const qty = Math.max(0.01, Number(l.quantity) || 0);
    const sku = (l.productSku?.trim() || "—") as string;
    const nameParts = [String(l.productName || "").trim(), (l.variantName ?? "").trim()].filter(Boolean);
    const productName = nameParts.join(" · ") || "Ítem";
    const pid = (l.productId ?? "").trim();
    const vid = (l.productVariantId ?? "").trim();
    const taxIds = l.taxId?.trim() ? [l.taxId.trim()] : [];
    return {
      key: `po-line-${l.id}`,
      productId: pid,
      variantId: vid,
      productName,
      sku,
      barcode: null,
      attributeValues: {},
      purchaseUnitLabel: l.unitOfMeasure?.trim() || null,
      quantity: qty,
      unitPrice: Math.max(0, Math.round(Number(l.unitPrice) || 0)),
      taxIds,
    };
  });
}

function mapReceptionLinesToDocumentLines(
  recLines: ReceptionDetailForReturn["lines"],
  defaultTaxIds: string[] = [],
): PurchaseDocumentLine[] {
  const rows = recLines.filter((l) => (Number(l.receivedQuantity ?? l.quantity) || 0) > 0);
  const taxIds = defaultTaxIds.filter(Boolean);
  return rows.map((l) => {
    const cap = Number(l.receivedQuantity ?? l.quantity) || 0;
    const sku = (l.sku?.trim() || "—") as string;
    const nameParts = [String(l.productName || "").trim(), (l.variantName ?? "").trim()].filter(Boolean);
    const productName = nameParts.join(" · ") || "Ítem";
    const pid = (l.productId ?? "").trim();
    const vid = (l.productVariantId ?? "").trim();
    const initialQty = Math.min(cap, Math.max(0.01, cap));
    return {
      key: `ret-line-${l.id}`,
      productId: pid,
      variantId: vid,
      productName,
      sku,
      barcode: null,
      attributeValues: {},
      quantity: initialQty,
      unitPrice: Math.max(0, Math.round(Number(l.unitPrice) || 0)),
      taxIds: [...taxIds],
      maxReturnQuantity: cap > 0 ? cap : null,
    };
  });
}

/** Impuestos de línea según recepción/DTE (neto + IVA del documento fiscal). */
function inferTaxIdsFromReceptionTotals(
  subtotal: number,
  taxAmount: number,
  activeTaxes: TaxListItem[],
): string[] {
  if (!activeTaxes.length) {
    return [];
  }
  const net = Math.round(Number(subtotal) || 0);
  const tax = Math.round(Number(taxAmount) || 0);
  if (net > 0 && tax > 0) {
    const impliedRate = Math.round((tax / net) * 100);
    const exact = activeTaxes.find((t) => Math.round(Number(t.rate) || 0) === impliedRate);
    if (exact) {
      return [exact.id];
    }
    const close = activeTaxes.find(
      (t) => Math.abs((Number(t.rate) || 0) - impliedRate) <= 1,
    );
    if (close) {
      return [close.id];
    }
  }
  return [];
}

function computeLineFiscalAmounts(
  quantity: number,
  unitPrice: number,
  taxIds: string[],
  taxById: Map<string, TaxListItem>,
): {
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  total: number;
  taxId: string | null;
} {
  const subtotal = Math.round(quantity * unitPrice);
  let rateSumPct = 0;
  let taxId: string | null = null;
  for (const tid of taxIds) {
    const t = taxById.get(tid);
    if (t) {
      rateSumPct += Number(t.rate) || 0;
      if (!taxId) {
        taxId = tid;
      }
    }
  }
  const taxAmount = Math.round((subtotal * rateSumPct) / 100);
  return {
    subtotal,
    taxAmount,
    taxRate: rateSumPct,
    total: subtotal + taxAmount,
    taxId,
  };
}

/** Recepción / compra: línea lista para valorizar inventario y PMP. */
function receptionLineReadyForInventory(line: PurchaseDocumentLine): boolean {
  const cost = Number(line.unitPrice) || 0;
  return (
    cost > 0 &&
    line.quantity > 0 &&
    Boolean(line.variantId?.trim()) &&
    Boolean(line.productId?.trim())
  );
}

function purchaseStockQtyDiffersFromPurchaseUnit(factor: number | undefined): boolean {
  const f = factor ?? 1;
  return Math.abs(f - 1) > 1e-6;
}

function formatPurchaseStockImpactQty(n: number): string {
  if (!Number.isFinite(n)) {
    return "0";
  }
  const rounded = Math.round(n);
  if (Math.abs(n - rounded) < 1e-6) {
    return String(rounded);
  }
  return n.toLocaleString("es-CL", { maximumFractionDigits: 4 });
}

function lineStockImpactQty(line: PurchaseDocumentLine): number {
  const factor = line.stockQtyPerPurchaseUnit ?? 1;
  return line.quantity * factor;
}

function initialUnitCostFromVariant(item: PurchasingVariantSearchItem): number {
  const suggested = item.suggestedPurchaseUnitCost;
  if (suggested != null && Number.isFinite(Number(suggested)) && Number(suggested) > 0) {
    return Math.round(Number(suggested));
  }
  if (item.pmp != null && Number.isFinite(Number(item.pmp)) && Number(item.pmp) > 0) {
    return Math.round(Number(item.pmp));
  }
  return 0;
}

function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function printableCompanyFromDetails(details: CompanyDetails | null): PrintableCompanyInfo {
  const razonSocial = details?.razonSocial?.trim() || "Empresa";
  const displayName = details?.nombreFantasia?.trim() ? details.nombreFantasia.trim() : null;
  const rut = details?.rut?.trim() ? details.rut.trim() : null;
  const settings = (details?.settings ?? {}) as Record<string, unknown>;

  const columnAddress = details?.address?.trim() ? details.address.trim() : "";
  const addressRaw =
    columnAddress ||
    (typeof settings["address"] === "string" ? settings["address"].trim() : "") ||
    (typeof settings["direccion"] === "string" ? settings["direccion"].trim() : "") ||
    (typeof settings["companyAddress"] === "string" ? settings["companyAddress"].trim() : "");
  const cityRaw = settings["city"] ?? settings["ciudad"];
  const columnPhone = details?.phone?.trim() ? details.phone.trim() : "";
  const phoneRaw =
    columnPhone || settings["phone"] || settings["telefono"] || settings["companyPhone"];
  const columnMail = details?.mail?.trim() ? details.mail.trim() : "";
  const emailRaw =
    columnMail ||
    (typeof settings["email"] === "string" ? settings["email"].trim() : "") ||
    (typeof settings["correo"] === "string" ? settings["correo"].trim() : "") ||
    (typeof settings["companyEmail"] === "string" ? settings["companyEmail"].trim() : "");

  const address = typeof addressRaw === "string" ? addressRaw.trim() : "";
  const city = typeof cityRaw === "string" ? cityRaw.trim() : "";
  const phone = typeof phoneRaw === "string" ? phoneRaw.trim() : null;
  const email = typeof emailRaw === "string" ? emailRaw.trim() : null;

  const addressLines = [address, city].filter(Boolean);

  return {
    razonSocial,
    displayName,
    rut,
    addressLines,
    phone,
    email,
  };
}

export function PurchaseDocumentBuilder({
  mode,
  variantSearch,
  searchQuery,
  searchPage,
  backToListHref,
  onSavePurchaseOrder,
  onSaveReception,
  onSavePurchaseReturn,
  fetchReceptionDetail,
  resolveReceptionBySupplierDocument,
  resolveReceptionForReturn,
  fetchPurchaseOrderDetail,
  searchPurchaseOrders,
  fieldDensity = "default",
}: PurchaseDocumentBuilderProps) {
  const router = useRouter();
  const reference = usePurchaseDocumentReferenceData();
  const suppliers = reference.status === "ready" ? reference.suppliers : EMPTY_SUPPLIER_LIST;
  const storages = reference.status === "ready" ? reference.storages : EMPTY_STORAGE_LIST;
  const taxes = reference.status === "ready" ? reference.taxes : EMPTY_TAX_LIST;
  const branchId = reference.status === "ready" ? reference.branchId : "";
  const companyBankAccounts = reference.status === "ready" ? reference.companyBankAccounts : EMPTY_COMPANY_BANKS;
  const cashHubs = reference.status === "ready" ? reference.cashHubs : EMPTY_CASH_HUB_LIST;
  const referenceLoading = reference.status === "loading";
  const referenceError = reference.status === "error" ? reference.message : null;
  const referenceFieldsLocked = referenceLoading || referenceError != null;

  /**
   * En documentos de compra (OC / recepción) no se deben listar impuestos de tipo RETENTION
   * en las líneas (aplican a otros flujos como honorarios/retenciones).
   */
  const activeTaxes = useMemo(
    () => taxes.filter((t) => t.isActive !== false && t.taxType !== "RETENTION"),
    [taxes],
  );
  const activeTaxIdSet = useMemo(() => new Set(activeTaxes.map((t) => t.id)), [activeTaxes]);
  const activeStorages = useMemo(() => storages.filter((s) => s.isActive !== false), [storages]);
  const activeSuppliers = useMemo(() => suppliers.filter((s) => s.isActive !== false), [suppliers]);

  const supplierOptions: Option[] = useMemo(
    () => activeSuppliers.map((s) => ({ id: s.id, label: supplierLabel(s) })),
    [activeSuppliers],
  );
  const storageOptions: Option[] = useMemo(
    () => activeStorages.map((s) => ({ id: s.id, label: s.name })),
    [activeStorages],
  );
  const cashHubOptions: Option[] = useMemo(
    () =>
      cashHubs.map((h) => ({
        id: h.id,
        label: (h.name?.trim() || h.code?.trim() || h.id) as string,
      })),
    [cashHubs],
  );

  const documentKindOptions: Option[] = useMemo(
    () => [
      { id: "invoice", label: "Factura" },
      { id: "receipt", label: "Boleta" },
      { id: "guide", label: "Guía de despacho" },
      { id: "other", label: "Otro" },
    ],
    [],
  );

  const loadReturnSourceOptions: Option[] = useMemo(
    () => [
      { id: "reception", label: "Recepción" },
      { id: "invoice", label: "Factura" },
      { id: "receipt", label: "Boleta" },
    ],
    [],
  );

  const showLineTaxes = true;
  const [lines, setLines] = useState<PurchaseDocumentLine[]>([]);
  const showStockImpactColumn = useMemo(
    () =>
      mode !== "purchase_return" &&
      lines.some((l) => purchaseStockQtyDiffersFromPurchaseUnit(l.stockQtyPerPurchaseUnit)),
    [mode, lines],
  );
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [storageId, setStorageId] = useState<string | null>(null);
  const [docDate, setDocDate] = useState(todayIsoDate);
  const [docKind, setDocKind] = useState<string>("invoice");
  const [docReference, setDocReference] = useState("");
  const [documentNotes, setDocumentNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [receptionPaymentOpen, setReceptionPaymentOpen] = useState(false);
  const [receptionPaymentDraft, setReceptionPaymentDraft] =
    useState<ReceptionSupplierDocumentPaymentPayload | null>(null);
  const [externalReference, setExternalReference] = useState("");
  const [sourceReceptionId, setSourceReceptionId] = useState<string | null>(null);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [loadReturnSource, setLoadReturnSource] = useState<"reception" | "invoice" | "receipt">(
    "reception",
  );
  const [loadReturnFolioInput, setLoadReturnFolioInput] = useState("");
  const [loadBusy, setLoadBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [linkedPurchaseOrderId, setLinkedPurchaseOrderId] = useState<string | null>(null);
  const [linkedPurchaseOrderFolio, setLinkedPurchaseOrderFolio] = useState<string | null>(null);
  const [loadPoDialogOpen, setLoadPoDialogOpen] = useState(false);
  const [loadPoMode, setLoadPoMode] = useState<"id" | "folio">("folio");
  const [loadPoIdInput, setLoadPoIdInput] = useState("");
  const [loadPoFolioInput, setLoadPoFolioInput] = useState("");
  const [loadPoBusy, setLoadPoBusy] = useState(false);
  const [loadPoError, setLoadPoError] = useState<string | null>(null);

  const loadPoModeOptions: Option[] = useMemo(
    () => [
      { id: "folio", label: "Folio OC" },
      { id: "id", label: "ID transacción" },
    ],
    [],
  );

  // Impresión automática de órdenes de compra (A4 por defecto).
  const { contentRef: poPrintRef, handlePrint: printPurchaseOrder } = usePrint(
    "orden-compra",
    "A4",
    "portrait",
  );
  const [poPrintModel, setPoPrintModel] = useState<{
    company: PrintableCompanyInfo;
    order: PurchaseOrderPrintModel;
  } | null>(null);

  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [previewCompany, setPreviewCompany] = useState<PrintableCompanyInfo | null>(null);

  useEffect(() => {
    if (!printPreviewOpen) {
      return;
    }
    let cancelled = false;
    setPreviewCompany(null);
    void getCompanyDetailsAction()
      .then((d) => {
        if (!cancelled) {
          setPreviewCompany(printableCompanyFromDetails(d));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewCompany(printableCompanyFromDetails(null));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [printPreviewOpen]);

  const selectedStorageLabel = useMemo(() => {
    const storageTrim = storageId?.trim();
    if (!storageTrim) {
      return null;
    }
    return storageOptions.find((o) => String(o.id) === String(storageTrim))?.label ?? null;
  }, [storageId, storageOptions]);

  const previewPurchaseOrderLines = useMemo<CreatePurchaseOrderLineInput[]>(
    () =>
      lines.map((l) => ({
        productId: l.productId,
        variantId: l.variantId,
        productName: l.productName,
        sku: l.sku,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxIds: l.taxIds,
        attributeValues: { ...l.attributeValues },
      })),
    [lines],
  );

  const selectedSupplierOption = useMemo(() => {
    if (supplierId == null || supplierId === "") {
      return null;
    }
    return supplierOptions.find((o) => String(o.id) === String(supplierId)) ?? null;
  }, [supplierId, supplierOptions]);

  const selectedSupplierRow = useMemo(() => {
    if (supplierId == null || supplierId === "") {
      return null;
    }
    return activeSuppliers.find((s) => String(s.id) === String(supplierId)) ?? null;
  }, [supplierId, activeSuppliers]);

  const supplierPrintIdentity = useMemo(
    () => buildSupplierIdentityPrintFields(selectedSupplierRow),
    [selectedSupplierRow],
  );

  const receptionShowDocumentKindInPrint = useMemo(
    () => !(docKind === "other" && !docReference.trim()),
    [docKind, docReference],
  );

  const supplierPrintForDocuments = useMemo((): SupplierPrintSummaryModel => {
    const refTrim = docReference.trim();
    const includeRefInSupplierBlock =
      mode === "reception" && receptionShowDocumentKindInPrint && Boolean(refTrim);
    return {
      commercialName: selectedSupplierOption?.label ?? null,
      identity: supplierPrintIdentity,
      documentReference: includeRefInSupplierBlock ? refTrim : null,
    };
  }, [
    mode,
    selectedSupplierOption,
    supplierPrintIdentity,
    docReference,
    receptionShowDocumentKindInPrint,
  ]);

  const addVariant = useCallback((item: PurchasingVariantSearchItem) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.variantId === item.id);
      if (existing) {
        return prev.map((l) =>
          l.variantId === item.id ? { ...l, quantity: Math.max(1, l.quantity + 1) } : l,
        );
      }
      const price = initialUnitCostFromVariant(item);
      const row: PurchaseDocumentLine = {
        key: `${item.id}-${Date.now()}`,
        productId: item.productId,
        variantId: item.id,
        productName: item.productName,
        sku: item.sku,
        barcode: item.barcode,
        attributeValues: { ...item.attributeValues },
        purchaseUnitLabel: item.purchaseUnitLabel?.trim() || null,
        stockBaseUnitLabel: item.stockBaseUnitLabel?.trim() || null,
        stockQtyPerPurchaseUnit:
          item.stockQtyPerPurchaseUnit != null && item.stockQtyPerPurchaseUnit > 0
            ? item.stockQtyPerPurchaseUnit
            : 1,
        quantity: 1,
        unitPrice: price,
        taxIds: (item.defaultTaxIds ?? []).filter((id) => activeTaxIdSet.has(id)),
      };
      return [...prev, row];
    });
  }, [activeTaxIdSet]);

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const updateLine = useCallback(
    (key: string, patch: Partial<Pick<PurchaseDocumentLine, "quantity" | "unitPrice" | "taxIds">>) => {
      setLines((prev) =>
        prev.map((l) => {
          if (l.key !== key) {
            return l;
          }
          let next: PurchaseDocumentLine = { ...l, ...patch };
          if (mode === "purchase_return" && patch.quantity != null) {
            let q = Number(patch.quantity);
            if (!Number.isFinite(q)) {
              q = l.quantity;
            }
            const max = l.maxReturnQuantity;
            if (max != null && max > 0 && q > max) {
              q = max;
            }
            if (q < 0.01) {
              q = 0.01;
            }
            next = { ...next, quantity: q };
          }
          return next;
        }),
      );
    },
    [mode],
  );

  const toggleLineTax = useCallback((lineKey: string, taxId: string, checked: boolean) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== lineKey) {
          return l;
        }
        const set = new Set(l.taxIds);
        if (checked) {
          set.add(taxId);
        } else {
          set.delete(taxId);
        }
        return { ...l, taxIds: [...set] };
      }),
    );
  }, []);

  const taxById = useMemo(() => new Map(activeTaxes.map((t) => [t.id, t])), [activeTaxes]);

  const summary = useMemo(() => {
    let subtotalNeto = 0;
    let impuestosTotal = 0;

    for (const line of lines) {
      const fiscal = computeLineFiscalAmounts(
        line.quantity,
        line.unitPrice,
        line.taxIds,
        taxById,
      );
      subtotalNeto += fiscal.subtotal;
      impuestosTotal += fiscal.taxAmount;
    }

    const total = subtotalNeto + impuestosTotal;
    return { subtotalNeto, impuestosTotal, total };
  }, [lines, taxById]);

  const appliedTaxNames = useMemo(() => {
    const taxById = new Map(activeTaxes.map((t) => [t.id, t]));
    const seen = new Set<string>();
    const names: string[] = [];
    for (const line of lines) {
      for (const tid of line.taxIds) {
        const t = taxById.get(tid);
        const n = t?.name?.trim();
        if (n && !seen.has(n)) {
          seen.add(n);
          names.push(n);
        }
      }
    }
    return names;
  }, [lines, activeTaxes]);

  const supplierFiscalTaxInfo = useMemo(() => {
    const taxById = new Map(activeTaxes.map((t) => [t.id, t]));
    for (const line of lines) {
      for (const tid of line.taxIds) {
        if (taxById.has(tid)) {
          const t = taxById.get(tid)!;
          return { taxId: tid, taxRatePct: Number(t.rate) || 0 };
        }
      }
    }
    return { taxId: null as string | null, taxRatePct: 0 };
  }, [lines, activeTaxes]);

  const receptionPaymentForFiscal =
    docKind === "invoice" || docKind === "receipt"
      ? (receptionPaymentDraft ?? {
          mode: "PENDING" as const,
          paidLines: [],
          scheduledLines: [],
        })
      : null;

  const receptionPaymentSummaryText = useMemo(() => {
    if (!receptionPaymentForFiscal) {
      return "";
    }
    return formatReceptionPaymentSummary(receptionPaymentForFiscal);
  }, [receptionPaymentForFiscal]);

  const modeTitle =
    mode === "reception"
      ? "Ingresar recepción de compra"
      : mode === "purchase_return"
        ? "Nueva devolución de compra"
        : "Crear orden de compra";

  const canSavePurchaseReturnBase =
    mode === "purchase_return" && Boolean(onSavePurchaseReturn) && Boolean(branchId?.trim());
  const canConfirmPurchaseReturn =
    canSavePurchaseReturnBase &&
    Boolean(supplierId?.trim()) &&
    Boolean(storageId?.trim()) &&
    lines.length > 0;

  const showReceptionPaymentUi = mode === "reception" && (docKind === "invoice" || docKind === "receipt");

  useEffect(() => {
    if (docKind !== "invoice" && docKind !== "receipt") {
      setReceptionPaymentDraft(null);
    }
  }, [docKind]);

  useEffect(() => {
    if (!showReceptionPaymentUi) {
      setReceptionPaymentOpen(false);
    }
  }, [showReceptionPaymentUi]);

  const canSavePurchaseOrderBase =
    mode === "purchase_order" && Boolean(onSavePurchaseOrder) && Boolean(branchId?.trim());
  /** Orden confirmada: proveedor + al menos una línea. */
  const canConfirmPurchaseOrder =
    canSavePurchaseOrderBase && Boolean(supplierId?.trim()) && lines.length > 0;

  const canSaveReceptionBase =
    mode === "reception" && Boolean(onSaveReception) && Boolean(branchId?.trim());
  const receptionLinesReadyForInventory =
    lines.length > 0 && lines.every(receptionLineReadyForInventory);
  const canConfirmReception =
    canSaveReceptionBase &&
    Boolean(supplierId?.trim()) &&
    Boolean(storageId?.trim()) &&
    receptionLinesReadyForInventory &&
    (docKind === "invoice" || docKind === "receipt" || docKind === "guide" || docKind === "other");

  const submitPurchaseOrder = useCallback(
    async (saveAsDraft: boolean) => {
      setSaveError(null);
      if (mode !== "purchase_order") {
        setSaveError("El guardado aún no está disponible para recepciones.");
        return;
      }
      if (!onSavePurchaseOrder) {
        setSaveError("No hay servicio de guardado configurado.");
        return;
      }
      if (!branchId?.trim()) {
        setSaveError("No hay sucursal configurada. Revise la empresa o cree una sucursal.");
        return;
      }
      if (!saveAsDraft) {
        if (!supplierId?.trim()) {
          setSaveError("Seleccione un proveedor.");
          return;
        }
        if (lines.length === 0) {
          setSaveError("Agregue al menos una línea de producto.");
          return;
        }
      }

      const storageTrim = storageId?.trim();
      const input: CreatePurchaseOrderInput = {
        branchId: branchId.trim(),
        ...(supplierId?.trim() ? { supplierId: supplierId.trim() } : {}),
        ...(storageTrim ? { storageId: storageTrim } : {}),
        documentDate: docDate,
        ...(documentNotes.trim() ? { notes: documentNotes.trim() } : {}),
        lines: lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId,
          productName: l.productName,
          sku: l.sku,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          taxIds: l.taxIds,
        })),
        ...(saveAsDraft ? { saveAsDraft: true } : {}),
      };

      setIsSaving(true);
      try {
        const result = await onSavePurchaseOrder(input);
        if (result.success) {
          // Lanzar impresión automática ANTES de navegar al listado.
          try {
            const companyDetails = await getCompanyDetailsAction();
            const company = printableCompanyFromDetails(companyDetails);

            setPoPrintModel({
              company,
              order: {
                id: result.id,
                documentNumber: result.documentNumber ?? null,
                documentDate: docDate,
                storageLabel: selectedStorageLabel,
                lines: input.lines.map((dto, idx) => ({
                  ...dto,
                  attributeValues:
                    lines[idx] != null ? { ...lines[idx].attributeValues } : undefined,
                })),
                notes: documentNotes.trim() || null,
                subtotalNeto: summary.subtotalNeto,
                impuestosTotal: summary.impuestosTotal,
                total: summary.total,
                appliedTaxNames,
                supplierPrint: supplierPrintForDocuments,
              },
            });

            // Esperar a que React pinte el contenido en el DOM antes de imprimir.
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                printPurchaseOrder();
              });
            });
          } catch {
            // Si falla la impresión, igual navegamos.
          }
          router.push("/purchasing/transactions/orders");
        } else {
          setSaveError(result.error);
        }
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "Error al guardar.");
      } finally {
        setIsSaving(false);
      }
    },
    [
      mode,
      onSavePurchaseOrder,
      branchId,
      supplierId,
      storageId,
      docDate,
      lines,
      router,
      selectedSupplierOption,
      selectedStorageLabel,
      printPurchaseOrder,
      documentNotes,
      summary,
      appliedTaxNames,
      supplierPrintForDocuments,
    ],
  );

  const submitReception = useCallback(async () => {
    setSaveError(null);
    if (mode !== "reception") {
      return;
    }
    if (!onSaveReception) {
      setSaveError("No hay servicio de guardado configurado.");
      return;
    }
    if (!branchId?.trim()) {
      setSaveError("No hay sucursal configurada.");
      return;
    }
    if (!storageId?.trim()) {
      setSaveError("Seleccione almacén destino.");
      return;
    }
    if (!supplierId?.trim()) {
      setSaveError("Seleccione un proveedor.");
      return;
    }
    if (lines.length === 0) {
      setSaveError("Agregue al menos una línea de producto.");
      return;
    }
    if (!receptionLinesReadyForInventory) {
      setSaveError(
        "Cada línea debe tener variante, cantidad y costo unitario de compra mayor a cero (actualiza el PMP).",
      );
      return;
    }
    if (docKind !== "invoice" && docKind !== "receipt" && docKind !== "guide" && docKind !== "other") {
      setSaveError("Seleccione tipo de documento.");
      return;
    }

    const input: CreateDirectReceptionInput = {
      branchId: branchId.trim(),
      storageId: storageId.trim(),
      supplierId: supplierId.trim(),
      purchaseOrderId: linkedPurchaseOrderId?.trim() || null,
      reference: docReference.trim() || null,
      documentType: docKind as ReceptionDteType,
      notes: documentNotes.trim() || null,
      lines: lines.map((l) => {
        const qty = l.quantity;
        const unit = l.unitPrice;
        const lineSubtotal = qty * unit;
        return {
          productId: l.productId,
          productVariantId: l.variantId,
          productName: l.productName,
          sku: l.sku,
          quantity: qty,
          unitPrice: unit,
          unitCost: unit,
          subtotal: lineSubtotal,
          receivedQuantity: qty,
        };
      }),
    };

    if (docKind === "invoice" || docKind === "receipt") {
      input.supplierDocumentPayment =
        receptionPaymentDraft ??
        ({
          mode: "PENDING",
          paidLines: [],
          scheduledLines: [],
        } as ReceptionSupplierDocumentPaymentPayload);
      input.supplierFiscalAmounts = {
        subtotalNeto: summary.subtotalNeto,
        taxAmount: summary.impuestosTotal,
        total: summary.total,
        taxId: supplierFiscalTaxInfo.taxId,
        taxRatePct: supplierFiscalTaxInfo.taxRatePct,
      };
    }

    setIsSaving(true);
    try {
      const result = await onSaveReception(input);
      if (result.success) {
        if (result.supplierDocumentError) {
          setSaveError(
            `La recepción se guardó, pero el documento de proveedor no quedó completo: ${result.supplierDocumentError}`,
          );
          return;
        }
        router.push("/purchasing/transactions/receptions");
      } else {
        setSaveError(result.error);
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setIsSaving(false);
    }
  }, [
    mode,
    onSaveReception,
    branchId,
    storageId,
    supplierId,
    lines,
    docReference,
    docKind,
    documentNotes,
    router,
    receptionPaymentDraft,
    summary.subtotalNeto,
    summary.impuestosTotal,
    summary.total,
    supplierFiscalTaxInfo.taxId,
    supplierFiscalTaxInfo.taxRatePct,
    linkedPurchaseOrderId,
    receptionLinesReadyForInventory,
  ]);

  const applyLoadedReception = useCallback((r: ReceptionDetailForReturn) => {
    const defaultTaxIds = inferTaxIdsFromReceptionTotals(
      r.subtotal ?? 0,
      r.taxAmount ?? 0,
      activeTaxes,
    );
    const mapped = mapReceptionLinesToDocumentLines(r.lines, defaultTaxIds);
    if (mapped.length === 0) {
      setLoadError("La recepción no tiene líneas con cantidad mayor a cero.");
      return;
    }
    setLines(mapped);
    if (r.supplierId?.trim()) {
      setSupplierId(r.supplierId.trim());
    }
    if (r.storageId?.trim()) {
      setStorageId(r.storageId.trim());
    }
    setSourceReceptionId(r.id);
    const d = r.createdAt?.trim();
    if (d && d.length >= 10) {
      setDocDate(d.slice(0, 10));
    }
    setLoadDialogOpen(false);
    setLoadError(null);
  }, [activeTaxes]);

  const applyLoadedPurchaseOrder = useCallback((detail: PurchasingTransactionDetail) => {
    if (detail.transactionType !== "PURCHASE_ORDER") {
      setLoadPoError("El documento no es una orden de compra.");
      return;
    }
    const mapped = mapPurchaseOrderLinesToDocumentLines(detail.lines);
    if (mapped.length === 0) {
      setLoadPoError("La orden de compra no tiene líneas con cantidad mayor a cero.");
      return;
    }
    setLines(mapped);
    if (detail.supplierId?.trim()) {
      setSupplierId(detail.supplierId.trim());
    }
    if (detail.storageId?.trim()) {
      setStorageId(detail.storageId.trim());
    }
    setLinkedPurchaseOrderId(detail.id);
    setLinkedPurchaseOrderFolio(purchaseOrderFolioLabel(detail));
    const d = detail.createdAt?.trim();
    if (d && d.length >= 10) {
      setDocDate(d.slice(0, 10));
    }
    if (detail.notes?.trim()) {
      setDocumentNotes(detail.notes.trim());
    }
    setLoadPoDialogOpen(false);
    setLoadPoError(null);
  }, []);

  const confirmLoadPurchaseOrder = useCallback(async () => {
    setLoadPoError(null);
    setLoadPoBusy(true);
    try {
      if (loadPoMode === "id") {
        const id = loadPoIdInput.trim();
        if (!id) {
          setLoadPoError("Ingrese el ID de la orden de compra.");
          return;
        }
        if (!UUID_RE.test(id)) {
          setLoadPoError("El ID debe ser un UUID válido.");
          return;
        }
        if (!fetchPurchaseOrderDetail) {
          setLoadPoError("La carga por ID no está configurada.");
          return;
        }
        const res = await fetchPurchaseOrderDetail(id);
        if (!res.success) {
          setLoadPoError(res.error);
          return;
        }
        applyLoadedPurchaseOrder(res.data);
      } else {
        const folio = loadPoFolioInput.trim();
        if (!folio) {
          setLoadPoError("Ingrese el folio de la orden de compra.");
          return;
        }
        if (!searchPurchaseOrders) {
          setLoadPoError("La búsqueda por folio no está configurada.");
          return;
        }
        const listed = await searchPurchaseOrders(folio);
        const folioLower = folio.toLowerCase();
        const match =
          listed.rows.find((r) => r.documentNumber.trim().toLowerCase() === folioLower) ??
          listed.rows[0];
        if (!match?.id) {
          setLoadPoError("No se encontró una orden de compra con ese folio.");
          return;
        }
        if (!fetchPurchaseOrderDetail) {
          setLoadPoError("No se pudo cargar el detalle de la orden.");
          return;
        }
        const res = await fetchPurchaseOrderDetail(match.id);
        if (!res.success) {
          setLoadPoError(res.error);
          return;
        }
        applyLoadedPurchaseOrder(res.data);
      }
    } finally {
      setLoadPoBusy(false);
    }
  }, [
    loadPoMode,
    loadPoIdInput,
    loadPoFolioInput,
    fetchPurchaseOrderDetail,
    searchPurchaseOrders,
    applyLoadedPurchaseOrder,
  ]);

  const confirmLoadReception = useCallback(async () => {
    setLoadError(null);
    setLoadBusy(true);
    try {
      const folio = loadReturnFolioInput.trim();
      if (!folio) {
        setLoadError("Ingrese el folio interno del documento.");
        return;
      }
      if (!resolveReceptionForReturn) {
        setLoadError("La carga de devolución no está configurada.");
        return;
      }
      const res = await resolveReceptionForReturn(
        loadReturnSource,
        folio,
        supplierId?.trim() || null,
      );
      if (!res.success) {
        setLoadError(res.error);
        return;
      }
      applyLoadedReception(res.reception);
    } finally {
      setLoadBusy(false);
    }
  }, [
    loadReturnSource,
    loadReturnFolioInput,
    supplierId,
    resolveReceptionForReturn,
    applyLoadedReception,
  ]);

  const loadReturnFolioLabel =
    loadReturnSource === "reception"
      ? "Folio recepción"
      : loadReturnSource === "invoice"
        ? "Folio factura"
        : "Folio boleta";

  const loadReturnFolioPlaceholder =
    loadReturnSource === "reception"
      ? "Ej. CMP-26-00001"
      : "Ej. folio interno del documento fiscal";

  const submitPurchaseReturn = useCallback(async () => {
    setSaveError(null);
    if (mode !== "purchase_return") {
      return;
    }
    if (!onSavePurchaseReturn) {
      setSaveError("No hay servicio de guardado configurado.");
      return;
    }
    if (!branchId?.trim()) {
      setSaveError("No hay sucursal configurada.");
      return;
    }
    if (!storageId?.trim()) {
      setSaveError("Seleccione almacén de salida.");
      return;
    }
    if (!supplierId?.trim()) {
      setSaveError("Seleccione un proveedor.");
      return;
    }
    if (lines.length === 0) {
      setSaveError("Cargue las líneas desde una recepción o factura.");
      return;
    }

    const dtoLines = lines.map((l) => {
      const fiscal = computeLineFiscalAmounts(l.quantity, l.unitPrice, l.taxIds, taxById);
      return {
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        productName: l.productName,
        productId: l.productId.trim() && UUID_RE.test(l.productId) ? l.productId : undefined,
        productVariantId: l.variantId.trim() && UUID_RE.test(l.variantId) ? l.variantId : undefined,
        sku: l.sku && l.sku !== "—" ? l.sku : undefined,
        subtotal: fiscal.subtotal,
        total: fiscal.total,
        taxAmount: fiscal.taxAmount,
        taxRate: fiscal.taxRate,
        taxId: fiscal.taxId ?? undefined,
      };
    });

    const linesTotalSum = dtoLines.reduce((s, x) => s + x.total, 0);
    const input: CreatePurchaseReturnInput = {
      branchId: branchId.trim(),
      supplierId: supplierId.trim(),
      storageId: storageId.trim(),
      subtotal: summary.subtotalNeto,
      taxAmount: summary.impuestosTotal,
      discountAmount: 0,
      total: summary.total,
      externalReference: externalReference.trim() || null,
      notes: documentNotes.trim() || null,
      lines: dtoLines,
      metadata: {
        links: {
          receptionId: sourceReceptionId?.trim() || null,
          purchaseOrderId: null,
          supplierInvoiceId: null,
        },
      },
    };

    if (Math.abs(linesTotalSum - summary.total) > 0.02) {
      setSaveError("Inconsistencia en totales; revise cantidades y precios.");
      return;
    }

    setIsSaving(true);
    try {
      const result = await onSavePurchaseReturn(input);
      if (result.success) {
        router.push("/purchasing/transactions/purchase-returns");
      } else {
        setSaveError(result.error);
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setIsSaving(false);
    }
  }, [
    mode,
    onSavePurchaseReturn,
    branchId,
    storageId,
    supplierId,
    lines,
    documentNotes,
    externalReference,
    summary.subtotalNeto,
    summary.impuestosTotal,
    summary.total,
    sourceReceptionId,
    router,
    taxById,
  ]);

  const purchaseDocViewportHeight =
    "h-[calc(100dvh-var(--app-topbar-height,3.75rem)-2.5rem)] max-h-[calc(100dvh-var(--app-topbar-height,3.75rem)-2.5rem)]";
  const rootLayoutClassName =
    mode === "purchase_return"
      ? "flex h-full min-h-0 min-w-0 w-full flex-1 flex-col"
      : `flex min-h-0 min-w-0 ${purchaseDocViewportHeight} flex-col gap-4 lg:flex-row lg:items-stretch`;

  return (
    <div className={rootLayoutClassName} data-test-id="purchase-document-builder">
      {/* Contenido oculto para impresión automática de órdenes de compra */}
      <div className="sr-only" aria-hidden>
        <div ref={poPrintRef}>
          {poPrintModel ? (
            <PurchaseOrderPrintDocument company={poPrintModel.company} order={poPrintModel.order} />
          ) : null}
        </div>
      </div>

      {mode !== "purchase_return" ? (
        <PurchaseDocumentVariantSearchPanel
          variantSearch={variantSearch}
          searchQuery={searchQuery}
          searchPage={searchPage}
          onAddVariant={addVariant}
          fieldDensity={fieldDensity}
        />
      ) : null}

      <section
        className={
          mode === "purchase_return"
            ? "flex h-full min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden rounded-xl border border-border bg-background p-3"
            : "flex min-h-0 min-w-0 flex-1 flex-col gap-3 rounded-xl border border-border bg-background p-3 lg:h-full lg:min-h-0"
        }
        data-test-id="purchase-document-detail-panel"
      >
        <div
          className={`flex w-full min-w-0 flex-col gap-3 ${mode === "purchase_return" ? "shrink-0" : ""}`}
          data-test-id="purchase-doc-header-fields"
        >
          {referenceError ? (
            <p className="rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-error" role="alert">
              {referenceError}
            </p>
          ) : null}
          <div className="grid w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)] lg:items-start">
            <div className="min-w-0 lg:max-w-[30vw] lg:justify-self-start">
              <h2
                className="text-sm font-semibold leading-snug text-foreground lg:pt-1"
                data-test-id="purchase-doc-title"
              >
                {modeTitle}
              </h2>
              {mode === "reception" && receptionPaymentSummaryText ? (
                <p
                  className="mt-1 max-w-full text-xs leading-snug text-muted-foreground"
                  data-test-id="purchase-doc-payment-summary"
                >
                  {receptionPaymentSummaryText}
                </p>
              ) : null}
              {mode === "reception" && linkedPurchaseOrderFolio ? (
                <p
                  className="mt-1 max-w-full text-xs leading-snug text-muted-foreground"
                  data-test-id="purchase-doc-po-summary"
                >
                  OC: {linkedPurchaseOrderFolio}
                </p>
              ) : null}
            </div>
            <div className="min-w-0 flex flex-col gap-3">
              <div className="grid w-full min-w-0 grid-cols-[repeat(auto-fit,minmax(11.5rem,1fr))] gap-x-3 gap-y-3">
                <div className="min-w-0">
                  <AutoComplete
                    label="Proveedor"
                    name="purchase-doc-supplier"
                    placeholder={referenceLoading ? "Cargando…" : "Buscar o seleccionar…"}
                    options={supplierOptions}
                    value={selectedSupplierOption}
                    onChange={(opt) => setSupplierId(opt ? String(opt.id) : null)}
                    alwaysShowLabel
                    density={fieldDensity}
                    disabled={referenceFieldsLocked}
                    data-test-id="purchase-doc-supplier"
                  />
                </div>
                <div className="min-w-0">
                  <TextField
                    label="Fecha"
                    name="purchase-doc-date"
                    type="date"
                    value={docDate}
                    onChange={(e) => setDocDate(e.target.value)}
                    density={fieldDensity}
                    className="w-full min-w-0"
                    data-test-id="purchase-doc-date"
                  />
                </div>
              </div>
              <div className="grid w-full min-w-0 grid-cols-[repeat(auto-fit,minmax(11.5rem,1fr))] gap-x-3 gap-y-3">
                <div className="min-w-0">
                  <Select
                    label={mode === "purchase_return" ? "Almacén de salida" : "Almacén destino"}
                    name="purchase-doc-storage"
                    placeholder={referenceLoading ? "Cargando…" : "Seleccionar"}
                    options={storageOptions}
                    value={storageId}
                    onChange={(id) => setStorageId(id == null ? null : String(id))}
                    allowClear
                    alwaysShowLabel
                    density={fieldDensity}
                    disabled={referenceFieldsLocked}
                    className="w-full min-w-0"
                    data-test-id="purchase-doc-storage"
                  />
                </div>
                {mode === "reception" ? (
                  <>
                    <div className="min-w-0">
                      <Select
                        label="DTE/Documento"
                        name="purchase-doc-document-type"
                        placeholder="Seleccionar"
                        options={documentKindOptions}
                        value={docKind}
                        onChange={(id) => setDocKind(id == null ? "invoice" : String(id))}
                        alwaysShowLabel
                        density={fieldDensity}
                        className="w-full min-w-0"
                        data-test-id="purchase-doc-document-type"
                      />
                    </div>
                    <div className="min-w-0">
                      <TextField
                        label="Referencia"
                        name="purchase-doc-reference"
                        value={docReference}
                        onChange={(e) => setDocReference(e.target.value)}
                        placeholder="Número o referencia del documento del proveedor"
                        alwaysShowLabel
                        density={fieldDensity}
                        className="w-full min-w-0"
                        data-test-id="purchase-doc-reference"
                      />
                    </div>
                  </>
                ) : mode === "purchase_return" ? (
                  <div className="min-w-0">
                    <TextField
                      label="Referencia externa"
                      name="purchase-doc-external-ref"
                      value={externalReference}
                      onChange={(e) => setExternalReference(e.target.value)}
                      placeholder="Folio o referencia opcional"
                      alwaysShowLabel
                      density={fieldDensity}
                      className="w-full min-w-0"
                      data-test-id="purchase-doc-external-reference"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table
            className="w-full min-w-[640px] table-fixed border-collapse text-xs"
            data-test-id="purchase-doc-lines-table"
          >
            <colgroup>
              {mode === "purchase_return" ? (
                <>
                  <col className="w-36 min-w-0" />
                  <col className="w-14" />
                  <col className="w-[5.67rem] min-w-0" />
                  <col className="min-w-[5.175rem] w-[5.4rem]" />
                  <col className="min-w-[4.9rem] w-[5.25rem]" />
                  <col className="w-[3.15rem]" />
                  <col className="w-[1.8rem] min-w-0" />
                </>
              ) : (
                <>
                  <col className="w-36 min-w-0" />
                  <col className="w-14" />
                  <col className="w-[6.93rem] min-w-0" />
                  <col className="w-[6.3rem] min-w-0" />
                  {showStockImpactColumn ? <col className="w-[3.2rem] min-w-0" /> : null}
                  {showLineTaxes ? <col className="min-w-[5.25rem] w-[5.775rem]" /> : null}
                  <col className="w-[4.05rem]" />
                  <col className="w-[1.8rem] min-w-0" />
                </>
              )}
            </colgroup>
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="max-w-[9rem] py-1.5 pr-2">Producto</th>
                <th className="py-1.5 pr-2">und. compra</th>
                <th
                  className={`py-1.5 pr-1 ${
                    mode === "purchase_return" ? "w-[5.67rem] max-w-[5.67rem]" : "w-[6.93rem] max-w-[6.93rem]"
                  }`}
                >
                  <span className="block truncate" title="Precio de compra neto">
                    Precio de compra neto
                  </span>
                </th>
                <th
                  className={`py-1.5 pr-1 ${
                    mode === "purchase_return"
                      ? "w-[5.4rem] max-w-[5.4rem]"
                      : "w-[6.3rem] max-w-[6.3rem]"
                  }`}
                >
                  <span
                    className="block truncate"
                    title={mode === "purchase_return" ? "Cantidad a devolver" : "Cantidad"}
                  >
                    {mode === "purchase_return" ? "Cantidad a devolver" : "Cantidad"}
                  </span>
                </th>
                {showStockImpactColumn ? (
                  <th className="w-[3.2rem] max-w-[3.2rem] py-1.5 pr-1 text-center">Stock</th>
                ) : null}
                {showLineTaxes ? (
                  <th
                    className={`py-1.5 pr-1 ${
                      mode === "purchase_return"
                        ? "w-[5.25rem] max-w-[5.25rem]"
                        : "w-[5.775rem] max-w-[5.775rem]"
                    }`}
                  >
                    <span className="block truncate" title="Impuestos">
                      Impuestos
                    </span>
                  </th>
                ) : null}
                <th
                  className={`py-1.5 pr-1 text-right ${
                    mode === "purchase_return" ? "w-[3.15rem] max-w-[3.15rem]" : "w-[4.05rem] max-w-[4.05rem]"
                  }`}
                >
                  Subtotal
                </th>
                <th className="w-[1.8rem] max-w-[1.8rem] py-1.5 text-center"> </th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      mode === "purchase_return"
                        ? showLineTaxes
                          ? 7
                          : 6
                        : (showLineTaxes ? 7 : 6) + (showStockImpactColumn ? 1 : 0)
                    }
                    className="py-10"
                  >
                    <span className="sr-only">Sin líneas en el documento</span>
                  </td>
                </tr>
              ) : (
                lines.map((line) => (
                  <tr key={line.key} className="border-b border-border/70 align-top" data-test-id={`purchase-doc-line-${line.key}`}>
                    <td className="min-w-0 max-w-[9rem] py-1.5 pr-2">
                      <ProductNameWithAttributes
                        name={line.productName}
                        attributeValues={line.attributeValues}
                        className="font-medium text-foreground"
                      />
                      <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 truncate font-mono text-[10px] text-muted-foreground">
                        <span>{line.sku}</span>
                        {line.barcode ? (
                          <>
                            <InlineSepDot />
                            <span>{line.barcode}</span>
                          </>
                        ) : null}
                      </p>
                    </td>
                    <td className="py-1.5 pr-2 align-middle text-muted-foreground">
                      <span className="text-xs font-medium tabular-nums">
                        {line.purchaseUnitLabel?.trim() || "—"}
                      </span>
                    </td>
                    <td
                      className={`py-1.5 pr-1 align-middle ${
                        mode === "purchase_return" ? "w-[5.67rem] max-w-[5.67rem]" : "w-[6.93rem] max-w-[6.93rem]"
                      }`}
                    >
                      <TextField
                        label=""
                        name={`price-${line.key}`}
                        type="currency"
                        currencySymbol="$"
                        startSymbol="$"
                        value={String(line.unitPrice)}
                        onChange={(e) => {
                          const n = Math.max(0, Math.round(Number(e.target.value) || 0));
                          updateLine(line.key, { unitPrice: n });
                        }}
                        density="compact"
                        className="w-full min-w-0"
                        data-test-id={`purchase-doc-price-${line.key}`}
                      />
                    </td>
                    <td
                      className={`py-1.5 pr-1 align-middle ${
                        mode === "purchase_return"
                          ? "w-[5.4rem] max-w-[5.4rem]"
                          : "w-[6.3rem] max-w-[6.3rem]"
                      }`}
                    >
                      <NumberStepper
                        value={line.quantity}
                        onChange={(v) =>
                          mode === "purchase_return"
                            ? updateLine(line.key, { quantity: Number(v) })
                            : updateLine(line.key, { quantity: Math.max(1, Math.round(Number(v))) })
                        }
                        min={mode === "purchase_return" ? 0.01 : 1}
                        max={mode === "purchase_return" ? (line.maxReturnQuantity ?? undefined) : undefined}
                        step={mode === "purchase_return" ? 0.01 : 1}
                        allowFloat={mode === "purchase_return"}
                        allowNegative={false}
                        data-test-id={`purchase-doc-qty-${line.key}`}
                      />
                    </td>
                    {showStockImpactColumn ? (
                      <td
                        className="w-[3.2rem] max-w-[3.2rem] py-1.5 pr-1 align-middle text-center text-[11px] tabular-nums text-foreground"
                        data-test-id={`purchase-doc-stock-impact-${line.key}`}
                      >
                        {purchaseStockQtyDiffersFromPurchaseUnit(line.stockQtyPerPurchaseUnit) ? (
                          <span
                            title={
                              line.stockBaseUnitLabel?.trim()
                                ? `${formatPurchaseStockImpactQty(lineStockImpactQty(line))} ${line.stockBaseUnitLabel.trim()}`
                                : undefined
                            }
                          >
                            {formatPurchaseStockImpactQty(lineStockImpactQty(line))}
                            {line.stockBaseUnitLabel?.trim() ? (
                              <span className="ml-0.5 text-muted-foreground">
                                {line.stockBaseUnitLabel.trim()}
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    ) : null}
                    {showLineTaxes ? (
                      <td
                        className={`py-1.5 pr-1 align-middle ${
                          mode === "purchase_return"
                            ? "w-[5.25rem] max-w-[5.25rem]"
                            : "w-[5.775rem] max-w-[5.775rem]"
                        }`}
                      >
                        <div className="flex min-h-8 min-w-0 flex-col items-start gap-y-1">
                          {referenceLoading ? (
                            <LoadingState className="flex items-center justify-center py-4" label="Cargando impuestos" size={12} />
                          ) : activeTaxes.length === 0 ? (
                            <span className="text-xs text-muted-foreground">Sin impuestos definidos</span>
                          ) : (
                            activeTaxes.map((tax) => (
                              <Switch
                                key={tax.id}
                                checked={line.taxIds.includes(tax.id)}
                                onChange={(checked) => toggleLineTax(line.key, tax.id, checked)}
                                label={`${tax.name} (${tax.rate}%)`}
                                labelPosition="right"
                                density="compact"
                                className="[&_.fs-switch__label]:text-[10px] [&_.fs-switch__label]:font-normal [&_.fs-switch__label]:leading-snug"
                                data-test-id={`purchase-doc-tax-${line.key}-${tax.id}`}
                              />
                            ))
                          )}
                        </div>
                      </td>
                    ) : null}
                    <td
                      className={`py-1.5 pr-1 align-middle text-right text-[11px] tabular-nums font-medium text-foreground ${
                        mode === "purchase_return" ? "w-[3.15rem] max-w-[3.15rem]" : "w-[4.05rem] max-w-[4.05rem]"
                      }`}
                    >
                      {formatMoney(line.quantity * line.unitPrice)}
                    </td>
                    <td className="w-[1.8rem] max-w-[1.8rem] px-0 py-1.5 align-middle text-center">
                      <IconButton
                        icon="Trash2"
                        variant="action"
                        size="sm"
                        title="Quitar línea"
                        ariaLabel="Quitar línea"
                        onClick={() => removeLine(line.key)}
                        data-test-id={`purchase-doc-remove-${line.key}`}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-auto flex w-full min-w-0 shrink-0 flex-col gap-0">
          <footer
            className="flex flex-col gap-1 rounded-lg border border-dashed border-border bg-muted/15 px-2.5 py-1.5 text-xs"
            data-test-id="purchase-doc-summary"
          >
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Subtotal neto</span>
              <span className="tabular-nums font-medium text-foreground" data-test-id="purchase-doc-summary-subtotal-net">
                {formatMoney(summary.subtotalNeto)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1 text-muted-foreground">
                <span>Impuestos</span>
                {appliedTaxNames.length > 0 ? (
                  <span className="text-muted-foreground/90">({appliedTaxNames.join(", ")})</span>
                ) : null}
              </span>
              <span className="tabular-nums font-medium text-foreground" data-test-id="purchase-doc-summary-taxes">
                {formatMoney(summary.impuestosTotal)}
              </span>
            </div>
            <div className="flex justify-between gap-3 border-t border-border pt-1.5">
              <span className="font-medium text-foreground">Total</span>
              <span className="tabular-nums font-semibold text-foreground" data-test-id="purchase-doc-summary-total">
                {formatMoney(summary.total)}
              </span>
            </div>
          </footer>
          <div className="w-full min-w-0 pt-3">
            <TextField
              label="Notas"
              name="purchase-doc-notes"
              value={documentNotes}
              onChange={(e) => setDocumentNotes(e.target.value)}
              placeholder="Observaciones para este documento (opcional)"
              alwaysShowLabel
              className="w-full min-w-0"
              disabled={isSaving}
              data-test-id="purchase-doc-notes"
            />
          </div>
          <div className="flex w-full flex-col gap-2 pt-3">
            {saveError ? (
              <p
                className="max-w-full text-right text-sm text-error"
                role="alert"
                data-test-id="purchase-doc-save-error"
              >
                {saveError}
              </p>
            ) : null}
            {(mode === "purchase_order" && onSavePurchaseOrder) ||
            (mode === "reception" && onSaveReception) ||
            (mode === "purchase_return" && onSavePurchaseReturn) ? (
              <div className="flex w-full flex-wrap items-center justify-between gap-2">
                <div className="flex shrink-0 items-center gap-1">
                  {backToListHref ? (
                    <IconButton
                      icon="ArrowLeft"
                      variant="action"
                      size="md"
                      title={
                        mode === "reception"
                          ? "Volver a recepciones"
                          : mode === "purchase_return"
                            ? "Volver a devoluciones"
                            : "Volver a órdenes de compra"
                      }
                      ariaLabel={
                        mode === "reception"
                          ? "Volver a recepciones"
                          : mode === "purchase_return"
                            ? "Volver a devoluciones"
                            : "Volver a órdenes de compra"
                      }
                      disabled={isSaving || referenceLoading}
                      onClick={() => router.push(backToListHref)}
                      data-test-id="purchase-doc-back-to-list"
                    />
                  ) : null}
                  {mode === "purchase_return" && resolveReceptionForReturn ? (
                    <IconButton
                      icon="Upload"
                      variant="action"
                      size="md"
                      title="Cargar devolución"
                      ariaLabel="Cargar devolución"
                      disabled={isSaving || referenceLoading}
                      onClick={() => {
                        setLoadError(null);
                        setLoadDialogOpen(true);
                      }}
                      data-test-id="purchase-doc-load-lines"
                    />
                  ) : null}
                  {mode === "reception" && (fetchPurchaseOrderDetail || searchPurchaseOrders) ? (
                    <IconButton
                      icon="Upload"
                      variant="action"
                      size="md"
                      title="Asociar orden de compra"
                      ariaLabel="Asociar orden de compra"
                      disabled={isSaving || referenceLoading}
                      onClick={() => {
                        setLoadPoError(null);
                        setLoadPoDialogOpen(true);
                      }}
                      data-test-id="purchase-doc-load-purchase-order"
                    />
                  ) : null}
                  {mode !== "purchase_return" ? (
                    <IconButton
                      icon="Printer"
                      variant="action"
                      size="md"
                      title="Vista previa de impresión"
                      ariaLabel="Vista previa de impresión"
                      disabled={isSaving || referenceLoading}
                      onClick={() => setPrintPreviewOpen(true)}
                      data-test-id="purchase-doc-print-preview"
                    />
                  ) : null}
                  {showReceptionPaymentUi ? (
                    <IconButton
                      icon="CircleDollarSign"
                      variant="action"
                      size="md"
                      title="Planificar pago del documento"
                      ariaLabel="Planificar pago del documento"
                      disabled={isSaving || referenceLoading}
                      onClick={() => setReceptionPaymentOpen(true)}
                      data-test-id="purchase-doc-payment-open"
                    />
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
                  <Button
                    variant="outlinedSecondary"
                    size="md"
                    type="button"
                    disabled={isSaving || mode !== "purchase_order" || !canSavePurchaseOrderBase}
                    onClick={() => {
                      if (mode === "purchase_order") {
                        void submitPurchaseOrder(true);
                      }
                    }}
                    data-test-id="purchase-doc-save-draft"
                    title={
                      mode === "reception" || mode === "purchase_return"
                        ? "El borrador solo está disponible en orden de compra."
                        : !canSavePurchaseOrderBase
                          ? "Configure sucursal para guardar borrador."
                          : undefined
                    }
                  >
                    {isSaving ? "Guardando…" : "Borrador"}
                  </Button>
                  <Button
                    variant="outlined"
                    size="md"
                    type="button"
                    disabled={
                      isSaving ||
                      (mode === "purchase_order"
                        ? !canConfirmPurchaseOrder
                        : mode === "reception"
                          ? !canConfirmReception
                          : !canConfirmPurchaseReturn)
                    }
                    onClick={() => {
                      if (mode === "purchase_order") {
                        void submitPurchaseOrder(false);
                      } else if (mode === "reception") {
                        void submitReception();
                      } else {
                        void submitPurchaseReturn();
                      }
                    }}
                    data-test-id="purchase-doc-save"
                    title={
                      mode === "purchase_order"
                        ? !canConfirmPurchaseOrder
                          ? "Orden confirmada: seleccione proveedor, líneas y sucursal."
                          : undefined
                        : mode === "reception"
                          ? !canConfirmReception
                            ? "Recepción: sucursal, proveedor, almacén, tipo de documento, líneas con costo unitario > 0 y variante."
                            : undefined
                          : !canConfirmPurchaseReturn
                            ? "Devolución: sucursal, proveedor, almacén y líneas cargadas desde una recepción."
                            : undefined
                    }
                  >
                    {isSaving ? "Guardando…" : "Guardar"}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {showReceptionPaymentUi ? (
        <PurchaseDocumentReceptionPaymentDialog
          open={receptionPaymentOpen}
          onClose={() => setReceptionPaymentOpen(false)}
          onApply={(payload) => {
            setReceptionPaymentDraft(payload);
            setReceptionPaymentOpen(false);
          }}
          documentTotal={summary.total}
          docDate={docDate}
          supplier={selectedSupplierRow}
          companyBankAccounts={companyBankAccounts}
          cashHubOptions={cashHubOptions}
          referenceLoading={referenceLoading}
          initialDraft={receptionPaymentDraft}
        />
      ) : null}

      <PrintDialog
        open={printPreviewOpen}
        onClose={() => setPrintPreviewOpen(false)}
        title="Vista previa de impresión"
        fileName={mode === "purchase_order" ? "orden-compra" : "recepcion-compra"}
        pageSize="A4"
        pageOrientation="portrait"
        size="xl"
        fullWidth
        maxWidth={960}
        disablePrint={!previewCompany}
        printIconButton
        scroll="paper"
      >
        {previewCompany ? (
          mode === "purchase_order" ? (
            <PurchaseOrderPrintDocument
              company={previewCompany}
              order={{
                id: "preview",
                documentNumber: null,
                documentDate: docDate,
                storageLabel: selectedStorageLabel,
                lines: previewPurchaseOrderLines,
                notes: documentNotes.trim() || null,
                subtotalNeto: summary.subtotalNeto,
                impuestosTotal: summary.impuestosTotal,
                total: summary.total,
                appliedTaxNames,
                supplierPrint: supplierPrintForDocuments,
              }}
            />
          ) : (
            <ReceptionPrintDocument
              company={previewCompany}
              reception={{
                documentDate: docDate,
                internalFolio: null,
                storageLabel: selectedStorageLabel,
                supplierPrint: supplierPrintForDocuments,
                lines: lines.map((l) => ({
                  productName: l.productName,
                  sku: l.sku,
                  quantity: l.quantity,
                  unitPrice: l.unitPrice,
                })),
                notes: documentNotes.trim() || null,
                subtotalNeto: summary.subtotalNeto,
                impuestosTotal: summary.impuestosTotal,
                total: summary.total,
                appliedTaxNames,
                paymentSummary:
                  docKind === "invoice" || docKind === "receipt"
                    ? receptionPaymentSummaryText || null
                    : null,
              }}
            />
          )
        ) : (
          <LoadingState className="flex items-center justify-center py-10" label="Cargando datos de la empresa" />
        )}
      </PrintDialog>

      <Dialog
        open={loadDialogOpen}
        onClose={() => {
          if (!loadBusy) {
            setLoadDialogOpen(false);
          }
        }}
        title="Cargar devolución"
        size="md"
        scroll="paper"
        hideActions
        showCloseButton={false}
        data-test-id="purchase-doc-load-dialog"
      >
        <div className="flex flex-col gap-3 px-1 py-1">
          <Select
            label="Documento"
            name="purchase-doc-load-return-source"
            options={loadReturnSourceOptions}
            value={loadReturnSource}
            onChange={(id) => {
              if (id === "invoice" || id === "receipt" || id === "reception") {
                setLoadReturnSource(id);
              }
            }}
            alwaysShowLabel
            density="compact"
            className="w-full min-w-0"
            data-test-id="purchase-doc-load-return-source"
          />
          <p className="text-xs leading-snug text-muted-foreground">
            {loadReturnSource === "reception"
              ? "Ingrese el folio interno de la recepción de compra (CMP-…). Se cargan las líneas de esa recepción."
              : "Ingrese el folio interno del documento fiscal. El sistema localiza la recepción asociada y carga sus productos."}
          </p>
          <TextField
            label={loadReturnFolioLabel}
            name="purchase-doc-load-return-folio"
            value={loadReturnFolioInput}
            onChange={(e) => setLoadReturnFolioInput(e.target.value)}
            placeholder={loadReturnFolioPlaceholder}
            alwaysShowLabel
            density="compact"
            disabled={loadBusy}
            className="w-full min-w-0"
            data-test-id="purchase-doc-load-return-folio"
          />
          {loadError ? (
            <p className="text-sm text-error" role="alert">
              {loadError}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button
              variant="outlinedSecondary"
              size="md"
              type="button"
              disabled={loadBusy}
              onClick={() => setLoadDialogOpen(false)}
              data-test-id="purchase-doc-load-cancel"
            >
              Cancelar
            </Button>
            <Button
              variant="outlined"
              size="md"
              type="button"
              loading={loadBusy}
              onClick={() => void confirmLoadReception()}
              data-test-id="purchase-doc-load-confirm"
            >
              Cargar devolución
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={loadPoDialogOpen}
        onClose={() => {
          if (!loadPoBusy) {
            setLoadPoDialogOpen(false);
          }
        }}
        title="Asociar orden de compra"
        size="md"
        scroll="paper"
        hideActions
        showCloseButton
        data-test-id="purchase-doc-load-po-dialog"
      >
        <div className="flex flex-col gap-3 px-1 py-1">
          <Select
            label="Buscar por"
            name="purchase-doc-load-po-mode"
            options={loadPoModeOptions}
            value={loadPoMode}
            onChange={(id) => setLoadPoMode(id === "id" ? "id" : "folio")}
            alwaysShowLabel
            density="compact"
            className="w-full min-w-0"
            data-test-id="purchase-doc-load-po-mode"
          />
          {loadPoMode === "id" ? (
            <TextField
              label="ID orden de compra"
              name="purchase-doc-load-po-id"
              value={loadPoIdInput}
              onChange={(e) => setLoadPoIdInput(e.target.value)}
              placeholder="UUID de la transacción PURCHASE_ORDER"
              alwaysShowLabel
              density="compact"
              disabled={loadPoBusy}
              className="w-full min-w-0"
              data-test-id="purchase-doc-load-po-id"
            />
          ) : (
            <>
              <p className="text-xs leading-snug text-muted-foreground">
                Se busca la orden de compra cuyo folio interno coincide con el valor ingresado y se cargan sus
                líneas, proveedor y almacén si están definidos.
              </p>
              <TextField
                label="Folio orden de compra"
                name="purchase-doc-load-po-folio"
                value={loadPoFolioInput}
                onChange={(e) => setLoadPoFolioInput(e.target.value)}
                placeholder="Ej. OC-000123"
                alwaysShowLabel
                density="compact"
                disabled={loadPoBusy}
                className="w-full min-w-0"
                data-test-id="purchase-doc-load-po-folio"
              />
            </>
          )}
          {loadPoError ? (
            <p className="text-sm text-error" role="alert">
              {loadPoError}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button
              variant="outlinedSecondary"
              size="md"
              type="button"
              disabled={loadPoBusy}
              onClick={() => setLoadPoDialogOpen(false)}
              data-test-id="purchase-doc-load-po-cancel"
            >
              Cancelar
            </Button>
            <Button
              variant="outlined"
              size="md"
              type="button"
              loading={loadPoBusy}
              onClick={() => void confirmLoadPurchaseOrder()}
              data-test-id="purchase-doc-load-po-confirm"
            >
              Cargar
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
