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

/** v5: dos slots de carrito por POS. */
export const CART_STORAGE_VERSION = 5;
/** v4: un carrito plano por POS (migración → slot 0). */
const CART_STORAGE_VERSION_SINGLE = 4;
const CART_KEY_PREFIX = "kai.pos.cart.v";
const CART_KEY_PREFIX_LEGACY = "flowstore.pos.cart.v";
/** Keys v3: …{posId}.{priceListId} */
const CART_STORAGE_VERSION_LEGACY_SCOPED = 3;

export type CartSlotIndex = 0 | 1 | 2 | 3;
export const CART_SLOT_COUNT = 4 as const;


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

/** Payload persistido de un slot (sin envelope). */
type StoredCartSlot = {
  lines: Array<{
    variantId: string;
    quantity: number;
    discount?: ResolvedLineDiscount | null;
    item: Omit<PosCartLine, "quantity" | "discount">;
  }>;
  customer?: PosSaleCustomer | null;
  quotation?: LoadedQuotationMeta | null;
  backorderDeposit?: BackorderDepositConfig | null;
  encargoModeEnabled?: boolean;
  cartMode?: PosCartMode;
  loadedReturnSale?: LoadedReturnSaleMeta | null;
  loadedBackorder?: LoadedBackorderMeta | null;
  loadedPresaleTicket?: LoadedPresaleTicketMeta | null;
  loadedPresaleTickets?: LoadedPresaleTicketMeta[] | null;
  payments?: PosPaymentLine[] | null;
  posDelivery?: PosDeliveryConfig | null;
};

type StoredCartEnvelope = {
  v: number;
  updatedAt: string;
  activeSlot: number;
  slots: StoredCartSlot[];
};

/** Forma legacy v1–v4 (carrito único con `v` en la raíz). */
type StoredCartLegacySingle = StoredCartSlot & {
  v: number;
  updatedAt?: string;
};

export type CartStorageScope = {
  pointOfSaleId: string;
  /** Solo para migrar keys v3 y backfill de stamp en líneas sin lista. */
  priceListId?: string | null;
  priceLists?: Array<{ id: string; name: string }> | null;
};

export type CartSlotSnapshot = {
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
};

export type CartEnvelope = {
  activeSlot: CartSlotIndex;
  slots: CartSlots;
};

export type CartSlots = [
  CartSlotSnapshot,
  CartSlotSnapshot,
  CartSlotSnapshot,
  CartSlotSnapshot,
];

export type CartSlotSummary = {
  index: CartSlotIndex;
  itemsCount: number;
  customerName: string | null;
  isEmpty: boolean;
  cartMode: PosCartMode;
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

function parseCustomer(value: unknown): PosSaleCustomer | null {
  const c = value;
  if (
    !c ||
    typeof c !== "object" ||
    typeof (c as PosSaleCustomer).name !== "string" ||
    typeof (c as PosSaleCustomer).document !== "string" ||
    typeof (c as PosSaleCustomer).phone !== "string"
  ) {
    return null;
  }
  return {
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
  };
}

export function emptySlotSnapshot(): CartSlotSnapshot {
  return {
    lines: [],
    customer: null,
    quotation: null,
    backorderDeposit: null,
    encargoModeEnabled: false,
    cartMode: "sale",
    loadedReturnSale: null,
    loadedBackorder: null,
    loadedPresaleTickets: [],
    payments: [],
    posDelivery: null,
  };
}

export function emptyCartSlots(): CartSlots {
  return [
    emptySlotSnapshot(),
    emptySlotSnapshot(),
    emptySlotSnapshot(),
    emptySlotSnapshot(),
  ];
}

export function emptyCartEnvelope(): CartEnvelope {
  return {
    activeSlot: 0,
    slots: emptyCartSlots(),
  };
}

export function padCartSlots(slots: CartSlotSnapshot[]): CartSlots {
  const out = emptyCartSlots();
  for (let i = 0; i < CART_SLOT_COUNT; i++) {
    out[i] = slots[i] ?? emptySlotSnapshot();
  }
  return out;
}

/** Clamp índice activo a `0..CART_SLOT_COUNT-1`. Exportado para tests. */
export function normalizeActiveSlot(value: unknown): CartSlotIndex {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  const i = Math.trunc(n);
  if (i < 0) return 0;
  if (i >= CART_SLOT_COUNT) return (CART_SLOT_COUNT - 1) as CartSlotIndex;
  return i as CartSlotIndex;
}

export function isSlotEmpty(slot: CartSlotSnapshot): boolean {
  return (
    slot.lines.length === 0 &&
    slot.customer == null &&
    slot.quotation == null &&
    slot.backorderDeposit == null &&
    !slot.encargoModeEnabled &&
    slot.cartMode === "sale" &&
    slot.loadedReturnSale == null &&
    slot.loadedBackorder == null &&
    slot.loadedPresaleTickets.length === 0 &&
    slot.payments.length === 0 &&
    slot.posDelivery == null
  );
}

export function summarizeCartSlot(
  index: CartSlotIndex,
  slot: CartSlotSnapshot,
): CartSlotSummary {
  const itemsCount = slot.lines.reduce((a, l) => a + (Number(l.quantity) || 0), 0);
  const name = slot.customer?.name?.trim() || null;
  return {
    index,
    itemsCount,
    customerName: name,
    isEmpty: isSlotEmpty(slot),
    cartMode: slot.cartMode,
  };
}

function parseSlotFields(
  parsed: StoredCartSlot,
  stamp: PriceListStamp | null,
  opts: { legacyVersion?: number } = {},
): CartSlotSnapshot {
  const empty = emptySlotSnapshot();
  if (!parsed || !Array.isArray(parsed.lines)) return empty;

  const legacyV = opts.legacyVersion;
  const isModern =
    legacyV == null ||
    legacyV === CART_STORAGE_VERSION_SINGLE ||
    legacyV === CART_STORAGE_VERSION_LEGACY_SCOPED ||
    legacyV === CART_STORAGE_VERSION;

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

  const customer = parseCustomer(parsed.customer);
  const quotation = isModern ? parseLoadedQuotation(parsed.quotation) : null;
  const backorderDeposit = parseBackorderDeposit(parsed.backorderDeposit);
  const encargoModeEnabled =
    isModern && typeof parsed.encargoModeEnabled === "boolean"
      ? parsed.encargoModeEnabled
      : Boolean(backorderDeposit);
  const cartMode = isModern ? parseCartMode(parsed.cartMode) : "sale";
  const loadedReturnSale = isModern ? parseLoadedReturnSale(parsed.loadedReturnSale) : null;
  const loadedBackorder = isModern ? parseLoadedBackorder(parsed.loadedBackorder) : null;

  let loadedPresaleTickets: LoadedPresaleTicketMeta[] = [];
  if (isModern) {
    loadedPresaleTickets = parseLoadedPresaleTickets(parsed.loadedPresaleTickets);
  } else if (legacyV === 2) {
    const legacy = parseLoadedPresaleTicket(parsed.loadedPresaleTicket);
    if (legacy) loadedPresaleTickets = [legacy];
  }

  const posDelivery = isModern ? parsePosDeliveryConfig(parsed.posDelivery) : null;

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
}

/** Parsea carrito legacy v1–v4 (raíz con `v` + `lines`). */
export function parseLegacySingleCartRaw(
  raw: string,
  stamp: PriceListStamp | null,
): CartSlotSnapshot {
  const empty = emptySlotSnapshot();
  try {
    const parsed = JSON.parse(raw) as StoredCartLegacySingle;
    if (!parsed || !Array.isArray(parsed.lines)) return empty;
    if (
      parsed.v !== CART_STORAGE_VERSION_SINGLE &&
      parsed.v !== CART_STORAGE_VERSION_LEGACY_SCOPED &&
      parsed.v !== 1 &&
      parsed.v !== 2
    ) {
      return empty;
    }
    return parseSlotFields(parsed, stamp, { legacyVersion: parsed.v });
  } catch {
    return empty;
  }
}

/** Parsea envelope v5 o migra JSON legacy a envelope. Exportado para tests. */
export function parseCartEnvelopeRaw(
  raw: string,
  stamp: PriceListStamp | null,
): CartEnvelope {
  const empty = emptyCartEnvelope();
  try {
    const parsed = JSON.parse(raw) as StoredCartEnvelope | StoredCartLegacySingle;
    if (!parsed || typeof parsed !== "object") return empty;

    if (parsed.v === CART_STORAGE_VERSION) {
      const env = parsed as StoredCartEnvelope;
      if (!Array.isArray(env.slots) || env.slots.length < 1) return empty;
      const parsedSlots = env.slots.map((s) =>
        parseSlotFields(s ?? { lines: [] }, stamp),
      );
      return {
        activeSlot: normalizeActiveSlot(env.activeSlot),
        slots: padCartSlots(parsedSlots),
      };
    }

    if (
      parsed.v === CART_STORAGE_VERSION_SINGLE ||
      parsed.v === CART_STORAGE_VERSION_LEGACY_SCOPED ||
      parsed.v === 1 ||
      parsed.v === 2
    ) {
      const slot0 = parseSlotFields(parsed as StoredCartLegacySingle, stamp, {
        legacyVersion: parsed.v,
      });
      return {
        activeSlot: 0,
        slots: padCartSlots([slot0]),
      };
    }

    return empty;
  } catch {
    return empty;
  }
}

function snapshotToStoredSlot(snap: CartSlotSnapshot): StoredCartSlot {
  return {
    lines: snap.lines.map((l) => ({
      variantId: l.variantId,
      quantity: l.quantity,
      discount: l.discount ?? null,
      item: (({ quantity, discount, ...rest }) => rest)(l),
    })),
    customer: snap.customer ?? null,
    quotation: snap.quotation ?? null,
    backorderDeposit: snap.backorderDeposit ?? null,
    encargoModeEnabled:
      snap.cartMode === "return" || snap.cartMode === "fulfill_backorder"
        ? false
        : snap.encargoModeEnabled,
    cartMode: snap.cartMode,
    loadedReturnSale: snap.cartMode === "return" ? snap.loadedReturnSale : null,
    loadedBackorder:
      snap.cartMode === "fulfill_backorder" ? snap.loadedBackorder : null,
    loadedPresaleTickets:
      snap.loadedPresaleTickets.length > 0 ? snap.loadedPresaleTickets : null,
    payments: snap.payments.length > 0 ? snap.payments : null,
    posDelivery:
      snap.cartMode === "sale" && !snap.encargoModeEnabled
        ? snap.posDelivery ?? null
        : null,
  };
}

function readRawFromKeys(primary: string, legacy: string): string | null {
  return getMigratedLocalStorageItem(primary, legacy);
}

export function readCartEnvelopeClient(input: CartStorageScope): CartEnvelope {
  const empty = emptyCartEnvelope();
  if (typeof window === "undefined") return empty;

  const stamp = resolveActivePriceListStamp({
    priceListId: input.priceListId,
    priceLists: input.priceLists,
  });

  const posId = input.pointOfSaleId.trim();
  if (!posId) return empty;

  try {
    const rawV5 = readRawFromKeys(keyFor(posId), legacyBrandKeyFor(posId));
    if (rawV5) {
      return parseCartEnvelopeRaw(rawV5, stamp);
    }

    const rawV4 = readRawFromKeys(
      keyFor(posId, CART_STORAGE_VERSION_SINGLE),
      legacyBrandKeyFor(posId, CART_STORAGE_VERSION_SINGLE),
    );
    if (rawV4) {
      return parseCartEnvelopeRaw(rawV4, stamp);
    }

    const listId = input.priceListId?.trim();
    if (listId) {
      const rawScoped = readRawFromKeys(
        scopedKeyFor(posId, listId),
        scopedLegacyBrandKeyFor(posId, listId),
      );
      if (rawScoped) {
        return parseCartEnvelopeRaw(rawScoped, stamp);
      }
    }

    return empty;
  } catch {
    return empty;
  }
}

export function writeCartEnvelopeClient(
  input: CartStorageScope,
  envelope: CartEnvelope,
): void {
  if (typeof window === "undefined") return;
  const posId = input.pointOfSaleId.trim();
  if (!posId) return;
  try {
    const slots = padCartSlots([...envelope.slots]);
    const payload: StoredCartEnvelope = {
      v: CART_STORAGE_VERSION,
      updatedAt: new Date().toISOString(),
      activeSlot: normalizeActiveSlot(envelope.activeSlot),
      slots: slots.map((s) => snapshotToStoredSlot(s)),
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

/** Preferir readCartEnvelopeClient; mantiene compat de callers. */
export function readCartClient(input: CartStorageScope): CartSlotSnapshot {
  const env = readCartEnvelopeClient(input);
  return env.slots[env.activeSlot] ?? emptySlotSnapshot();
}

/** Preferir writeCartEnvelopeClient. Actualiza solo el slot activo. */
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
  const current = readCartEnvelopeClient(input);
  const active = current.activeSlot;
  const snap: CartSlotSnapshot = {
    lines,
    customer,
    quotation,
    backorderDeposit,
    encargoModeEnabled,
    cartMode,
    loadedReturnSale,
    loadedBackorder,
    loadedPresaleTickets,
    payments,
    posDelivery,
  };
  const slots = padCartSlots([...current.slots]);
  slots[active] = snap;
  writeCartEnvelopeClient(input, { activeSlot: active, slots });
}
