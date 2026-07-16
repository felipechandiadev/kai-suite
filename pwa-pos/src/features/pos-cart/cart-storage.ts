import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { PosSaleCustomer } from "@/features/customers/types/pos-customer.types";
import type { BackorderDepositConfig } from "@/features/pos-cart/types/backorder-deposit.types";
import type {
  LoadedBackorderMeta,
  LoadedPresaleTicketMeta,
  LoadedReturnSaleMeta,
  PosCartMode,
} from "@/features/pos-cart/types/pos-cart-mode.types";
import type { PosPaymentLine } from "./pos-payment.types";
import {
  parsePosDeliveryConfig,
  type PosDeliveryConfig,
} from "@/features/pos-delivery/types/pos-delivery.types";
import type { ResolvedLineDiscount } from "@/features/promotions/lib/discount-engine.types";
import {
  backfillCartLinesPriceList,
  resolveActivePriceListStamp,
  type PriceListStamp,
} from "./lib/pos-cart-price-list";
import {
  getMigratedLocalStorageItem,
  setMigratedLocalStorageItem,
} from "@kai-shared/storage-key-migrate";

/** v4: un carrito por POS (lista de precios en las líneas, no en la key). */
const CART_STORAGE_VERSION = 4;
const CART_KEY_PREFIX = "kai.pos.cart.v";
const CART_KEY_PREFIX_LEGACY = "flowstore.pos.cart.v";
/** Keys v3: …{posId}.{priceListId} */
const CART_STORAGE_VERSION_LEGACY_SCOPED = 3;

/** Metadatos de una cotización cargada en el carrito. La venta resultante
 * de pagar el carrito se considerará una *conversión* de esa cotización
 * en lugar de una venta nueva (precios respetados desde el snapshot). */
export type LoadedQuotationMeta = {
  id: string;
  documentNumber: string;
  validUntil: string;
  expired: boolean;
  /** Cantidad máxima por variante según la cotización (no se puede superar al vender). */
  lineMaxQtyByVariantId: Record<string, number>;
};

type StoredCart = {
  v: number;
  updatedAt: string;
  lines: Array<{
    variantId: string;
    quantity: number;
    /** Descuento aplicado por el motor de promociones, persistido para
     * sobrevivir refresh y re-cálculo idempotente al cargar. */
    discount?: ResolvedLineDiscount | null;
    item: Omit<PosCartLine, "quantity" | "discount">;
  }>;
  customer?: PosSaleCustomer | null;
  quotation?: LoadedQuotationMeta | null;
  backorderDeposit?: BackorderDepositConfig | null;
  /** Modalidad encargo activa en pantalla de cobro. */
  encargoModeEnabled?: boolean;
  cartMode?: PosCartMode;
  loadedReturnSale?: LoadedReturnSaleMeta | null;
  loadedBackorder?: LoadedBackorderMeta | null;
  loadedPresaleTicket?: LoadedPresaleTicketMeta | null;
  loadedPresaleTickets?: LoadedPresaleTicketMeta[] | null;
  payments?: PosPaymentLine[] | null;
  posDelivery?: PosDeliveryConfig | null;
};

export type CartStorageScope = {
  pointOfSaleId: string;
  /** Solo para migrar keys v3 y backfill de stamp en líneas sin lista. */
  priceListId?: string | null;
  priceLists?: Array<{ id: string; name: string }> | null;
};

function parseDiscount(value: unknown): ResolvedLineDiscount | null {
  if (!value || typeof value !== "object") return null;
  const d = value as Partial<ResolvedLineDiscount>;
  if (
    typeof d.promotionId !== "string" ||
    typeof d.promotionCode !== "string" ||
    typeof d.discountAmount !== "number"
  ) {
    return null;
  }
  return {
    promotionId: d.promotionId,
    promotionCode: d.promotionCode,
    promotionName: typeof d.promotionName === "string" ? d.promotionName : "",
    discountPercentage:
      typeof d.discountPercentage === "number" ? d.discountPercentage : 0,
    discountAmount: d.discountAmount,
    appliedQuantity:
      typeof d.appliedQuantity === "number" ? d.appliedQuantity : 0,
    overridesUnitPrice: !!d.overridesUnitPrice,
    newUnitPrice:
      typeof d.newUnitPrice === "number" ? d.newUnitPrice : undefined,
  };
}

function keyFor(pointOfSaleId: string, version = CART_STORAGE_VERSION) {
  return `${CART_KEY_PREFIX}${version}.${pointOfSaleId}`;
}

function legacyBrandKeyFor(pointOfSaleId: string, version = CART_STORAGE_VERSION) {
  return `${CART_KEY_PREFIX_LEGACY}${version}.${pointOfSaleId}`;
}

function scopedKeyFor(
  pointOfSaleId: string,
  priceListId: string,
  version = CART_STORAGE_VERSION_LEGACY_SCOPED,
) {
  return `${CART_KEY_PREFIX}${version}.${pointOfSaleId}.${priceListId}`;
}

function scopedLegacyBrandKeyFor(
  pointOfSaleId: string,
  priceListId: string,
  version = CART_STORAGE_VERSION_LEGACY_SCOPED,
) {
  return `${CART_KEY_PREFIX_LEGACY}${version}.${pointOfSaleId}.${priceListId}`;
}

function parseBackorderDeposit(value: unknown): BackorderDepositConfig | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Partial<BackorderDepositConfig>;
  const percent = Number(o.percent);
  const amount = Number(o.amount);
  if (!Number.isFinite(percent) || !Number.isFinite(amount)) return null;
  if (percent < 1 || amount < 1) return null;
  return {
    percent: Math.min(100, Math.round(percent)),
    amount: Math.round(amount),
  };
}

function parseCartMode(value: unknown): PosCartMode {
  if (value === "return") return "return";
  if (value === "fulfill_backorder") return "fulfill_backorder";
  return "sale";
}

function parseLoadedQuotation(value: unknown): LoadedQuotationMeta | null {
  if (!value || typeof value !== "object") return null;
  const o = value as LoadedQuotationMeta;
  if (typeof o.id !== "string" || typeof o.documentNumber !== "string") return null;
  const lineMaxQtyByVariantId: Record<string, number> = {};
  if (o.lineMaxQtyByVariantId && typeof o.lineMaxQtyByVariantId === "object") {
    for (const [k, v] of Object.entries(o.lineMaxQtyByVariantId)) {
      const n = Number(v);
      if (k && Number.isFinite(n) && n > 0) lineMaxQtyByVariantId[k] = n;
    }
  }
  return {
    id: o.id,
    documentNumber: o.documentNumber,
    validUntil: typeof o.validUntil === "string" ? o.validUntil : "",
    expired: !!o.expired,
    lineMaxQtyByVariantId,
  };
}

function parseLoadedBackorder(value: unknown): LoadedBackorderMeta | null {
  if (!value || typeof value !== "object") return null;
  const o = value as LoadedBackorderMeta;
  if (typeof o.id !== "string" || typeof o.documentNumber !== "string") return null;
  const lineMaxQtyByVariantId: Record<string, number> = {};
  if (o.lineMaxQtyByVariantId && typeof o.lineMaxQtyByVariantId === "object") {
    for (const [k, v] of Object.entries(o.lineMaxQtyByVariantId)) {
      const n = Number(v);
      if (k && Number.isFinite(n) && n > 0) lineMaxQtyByVariantId[k] = Math.round(n);
    }
  }
  return {
    id: o.id,
    documentNumber: o.documentNumber,
    orderTotal: Number(o.orderTotal) || 0,
    depositAvailable: Number(o.depositAvailable) || 0,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : "",
    lineMaxQtyByVariantId,
  };
}

function parseLoadedPresaleTicket(value: unknown): LoadedPresaleTicketMeta | null {
  if (!value || typeof value !== "object") return null;
  const o = value as LoadedPresaleTicketMeta;
  if (typeof o.id !== "string" || typeof o.code !== "string") return null;
  const lineMaxQtyByVariantId: Record<string, number> = {};
  if (o.lineMaxQtyByVariantId && typeof o.lineMaxQtyByVariantId === "object") {
    for (const [k, v] of Object.entries(o.lineMaxQtyByVariantId)) {
      const n = Number(v);
      if (k && Number.isFinite(n) && n > 0) lineMaxQtyByVariantId[k] = n;
    }
  }
  return {
    id: o.id,
    code: o.code,
    total: Number(o.total) || 0,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : "",
    lineMaxQtyByVariantId,
  };
}

function parseLoadedPresaleTickets(value: unknown): LoadedPresaleTicketMeta[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => parseLoadedPresaleTicket(item))
    .filter((t): t is LoadedPresaleTicketMeta => t != null);
}

function parseLoadedReturnSale(value: unknown): LoadedReturnSaleMeta | null {
  if (!value || typeof value !== "object") return null;
  const o = value as LoadedReturnSaleMeta;
  if (typeof o.id !== "string" || typeof o.documentNumber !== "string") return null;
  const lineMaxReturnableQtyByVariantId: Record<string, number> = {};
  if (
    o.lineMaxReturnableQtyByVariantId &&
    typeof o.lineMaxReturnableQtyByVariantId === "object"
  ) {
    for (const [k, v] of Object.entries(o.lineMaxReturnableQtyByVariantId)) {
      const n = Number(v);
      if (k && Number.isFinite(n) && n > 0) {
        lineMaxReturnableQtyByVariantId[k] = n;
      }
    }
  }
  return {
    id: o.id,
    documentNumber: o.documentNumber,
    total: Number(o.total) || 0,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : "",
    lineMaxReturnableQtyByVariantId,
    sourceHasCustomer: o.sourceHasCustomer === true,
  };
}

function parsePayments(value: unknown): PosPaymentLine[] {
  if (!Array.isArray(value)) return [];
  return value.filter((p) => p && typeof p === "object") as PosPaymentLine[];
}

function emptyCartResult() {
  return {
    lines: [] as PosCartLine[],
    customer: null as PosSaleCustomer | null,
    quotation: null as LoadedQuotationMeta | null,
    backorderDeposit: null as BackorderDepositConfig | null,
    encargoModeEnabled: false,
    cartMode: "sale" as PosCartMode,
    loadedReturnSale: null as LoadedReturnSaleMeta | null,
    loadedBackorder: null as LoadedBackorderMeta | null,
    loadedPresaleTickets: [] as LoadedPresaleTicketMeta[],
    payments: [] as PosPaymentLine[],
    posDelivery: null as PosDeliveryConfig | null,
  };
}

function parseStoredCartRaw(raw: string, stamp: PriceListStamp | null) {
  const empty = emptyCartResult();
  try {
    const parsed = JSON.parse(raw) as StoredCart;
    if (!parsed || !Array.isArray(parsed.lines)) return empty;
    if (
      parsed.v !== CART_STORAGE_VERSION &&
      parsed.v !== CART_STORAGE_VERSION_LEGACY_SCOPED &&
      parsed.v !== 1 &&
      parsed.v !== 2
    ) {
      return empty;
    }
    let lines = parsed.lines
      .map((l) => {
        if (!l?.item || !l.variantId) return null;
        const qty = Number(l.quantity) || 0;
        if (qty <= 0) return null;
        const discount = parseDiscount((l as { discount?: unknown }).discount);
        return {
          ...(l.item as object),
          quantity: qty,
          discount,
        } as PosCartLine;
      })
      .filter(Boolean) as PosCartLine[];

    lines = backfillCartLinesPriceList(lines, stamp);

    const c = parsed.customer;
    const customer: PosSaleCustomer | null =
      c &&
      typeof c === "object" &&
      typeof (c as PosSaleCustomer).name === "string" &&
      typeof (c as PosSaleCustomer).document === "string" &&
      typeof (c as PosSaleCustomer).phone === "string"
        ? {
            customerId:
              (c as PosSaleCustomer).customerId != null &&
              String((c as PosSaleCustomer).customerId).trim() !== ""
                ? String((c as PosSaleCustomer).customerId)
                : null,
            name: String((c as PosSaleCustomer).name),
            document: String((c as PosSaleCustomer).document),
            phone: String((c as PosSaleCustomer).phone),
            email:
              (c as PosSaleCustomer).email != null &&
              String((c as PosSaleCustomer).email).trim() !== ""
                ? String((c as PosSaleCustomer).email)
                : null,
          }
        : null;

    const quotation =
      parsed.v === CART_STORAGE_VERSION || parsed.v === CART_STORAGE_VERSION_LEGACY_SCOPED
        ? parseLoadedQuotation(parsed.quotation)
        : null;

    const backorderDeposit = parseBackorderDeposit(parsed.backorderDeposit);
    const encargoModeEnabled =
      (parsed.v === CART_STORAGE_VERSION ||
        parsed.v === CART_STORAGE_VERSION_LEGACY_SCOPED) &&
      typeof parsed.encargoModeEnabled === "boolean"
        ? parsed.encargoModeEnabled
        : Boolean(backorderDeposit);
    const cartMode =
      parsed.v === CART_STORAGE_VERSION || parsed.v === CART_STORAGE_VERSION_LEGACY_SCOPED
        ? parseCartMode(parsed.cartMode)
        : "sale";
    const loadedReturnSale =
      parsed.v === CART_STORAGE_VERSION || parsed.v === CART_STORAGE_VERSION_LEGACY_SCOPED
        ? parseLoadedReturnSale(parsed.loadedReturnSale)
        : null;
    const loadedBackorder =
      parsed.v === CART_STORAGE_VERSION || parsed.v === CART_STORAGE_VERSION_LEGACY_SCOPED
        ? parseLoadedBackorder(parsed.loadedBackorder)
        : null;
    let loadedPresaleTickets: LoadedPresaleTicketMeta[] = [];
    if (
      parsed.v === CART_STORAGE_VERSION ||
      parsed.v === CART_STORAGE_VERSION_LEGACY_SCOPED
    ) {
      loadedPresaleTickets = parseLoadedPresaleTickets(parsed.loadedPresaleTickets);
    } else if (parsed.v === 2) {
      const legacy = parseLoadedPresaleTicket(parsed.loadedPresaleTicket);
      if (legacy) loadedPresaleTickets = [legacy];
    }

    const posDelivery =
      parsed.v === CART_STORAGE_VERSION || parsed.v === CART_STORAGE_VERSION_LEGACY_SCOPED
        ? parsePosDeliveryConfig(parsed.posDelivery)
        : null;

    return {
      lines,
      customer,
      quotation,
      backorderDeposit,
      encargoModeEnabled,
      cartMode,
      loadedReturnSale,
      loadedBackorder,
      loadedPresaleTickets,
      payments: parsePayments(parsed.payments),
      posDelivery,
    };
  } catch {
    return empty;
  }
}

function readRawFromKeys(primary: string, legacy: string): string | null {
  return getMigratedLocalStorageItem(primary, legacy);
}

export function readCartClient(input: CartStorageScope): {
  lines: PosCartLine[];
  customer: PosSaleCustomer | null;
  quotation: LoadedQuotationMeta | null;
  backorderDeposit: BackorderDepositConfig | null;
  encargoModeEnabled: boolean;
  cartMode: PosCartMode;
  loadedReturnSale: LoadedReturnSaleMeta | null;
  loadedBackorder: LoadedBackorderMeta | null;
  loadedPresaleTickets: LoadedPresaleTicketMeta[];
  payments: PosPaymentLine[];
  posDelivery: PosDeliveryConfig | null;
} {
  const empty = emptyCartResult();
  if (typeof window === "undefined") return empty;

  const stamp = resolveActivePriceListStamp({
    priceListId: input.priceListId,
    priceLists: input.priceLists,
  });

  const posId = input.pointOfSaleId.trim();
  if (!posId) return empty;

  try {
    const rawV4 = readRawFromKeys(keyFor(posId), legacyBrandKeyFor(posId));
    if (rawV4) {
      return parseStoredCartRaw(rawV4, stamp);
    }

    const listId = input.priceListId?.trim();
    if (listId) {
      const rawScoped = readRawFromKeys(
        scopedKeyFor(posId, listId),
        scopedLegacyBrandKeyFor(posId, listId),
      );
      if (rawScoped) {
        return parseStoredCartRaw(rawScoped, stamp);
      }
    }

    return empty;
  } catch {
    return empty;
  }
}

export function writeCartClient(
  input: CartStorageScope,
  lines: PosCartLine[],
  customer: PosSaleCustomer | null = null,
  quotation: LoadedQuotationMeta | null = null,
  backorderDeposit: BackorderDepositConfig | null = null,
  cartMode: PosCartMode = "sale",
  loadedReturnSale: LoadedReturnSaleMeta | null = null,
  encargoModeEnabled = false,
  loadedBackorder: LoadedBackorderMeta | null = null,
  loadedPresaleTickets: LoadedPresaleTicketMeta[] = [],
  payments: PosPaymentLine[] = [],
  posDelivery: PosDeliveryConfig | null = null,
): void {
  if (typeof window === "undefined") return;
  const posId = input.pointOfSaleId.trim();
  if (!posId) return;
  try {
    const payload: StoredCart = {
      v: CART_STORAGE_VERSION,
      updatedAt: new Date().toISOString(),
      lines: lines.map((l) => ({
        variantId: l.variantId,
        quantity: l.quantity,
        discount: l.discount ?? null,
        item: (({ quantity, discount, ...rest }) => rest)(l),
      })),
      customer: customer ?? null,
      quotation: quotation ?? null,
      backorderDeposit: backorderDeposit ?? null,
      encargoModeEnabled:
        cartMode === "return" || cartMode === "fulfill_backorder" ? false : encargoModeEnabled,
      cartMode,
      loadedReturnSale: cartMode === "return" ? loadedReturnSale : null,
      loadedBackorder: cartMode === "fulfill_backorder" ? loadedBackorder : null,
      loadedPresaleTickets: loadedPresaleTickets.length > 0 ? loadedPresaleTickets : null,
      payments: payments.length > 0 ? payments : null,
      posDelivery:
        cartMode === "sale" && !encargoModeEnabled ? posDelivery ?? null : null,
    };
    setMigratedLocalStorageItem(
      keyFor(posId),
      legacyBrandKeyFor(posId),
      JSON.stringify(payload),
    );
  } catch {
    // ignore
  }
}
