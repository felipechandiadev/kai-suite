/** Vista compacta de producto/variante (misma idea que `PurchaseDocumentProductPreview` en kai-admin). */

import type {
  PosProductAttribute,
  PosProductSearchItem,
} from "@/features/pos-products/types/pos-product.types";

type PosStockFields = Pick<
  PosProductSearchItem,
  | "trackInventory"
  | "availableStock"
  | "availableStockBase"
  | "stockBaseQtyPerCountSaleUnit"
  | "unitAllowDecimals"
>;

/** Unidad mostrada en cards de búsqueda y carrito: siempre venta, nunca base de stock. */
export function posDisplaySaleUnitSymbol(
  item: Pick<PosProductSearchItem, "unitSymbol" | "stockBaseUnitSymbol" | "saleUnitSymbol">,
): string | null {
  const sale = item.saleUnitSymbol?.trim();
  if (sale) return sale;
  const sym = item.unitSymbol?.trim() || null;
  const base = item.stockBaseUnitSymbol?.trim();
  if (sym && base && sym === base) return null;
  return sym;
}

/** Cantidad reservada para liquidar un encargo (`metadata` al cargar reserva). */
export function posGetReservedQtyForFulfillLine(line: {
  metadata?: Record<string, unknown> | null;
}): number | null {
  const meta = line.metadata;
  if (!meta || typeof meta !== "object") return null;
  const fulfillId = meta.fulfillBackorderId;
  if (fulfillId == null || String(fulfillId).trim() === "") return null;
  const raw = meta.reservedQty;
  const n = raw != null && raw !== "" ? Number(raw) : Number.NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/**
 * Stock efectivo para validar cantidad en carrito (unidad de venta).
 * En liquidación de encargo usa lo reservado para esa reserva; en venta normal, lo libre.
 */
export function posResolveEffectiveStockInSaleUnits(
  item: PosStockFields & { metadata?: Record<string, unknown> | null },
): number | null {
  const reserved = posGetReservedQtyForFulfillLine(item);
  if (reserved != null) return reserved;
  return posResolveAvailableStockInSaleUnits(item);
}

/** Cantidad de stock en unidades de venta (no en unidad base de inventario). */
export function posResolveAvailableStockInSaleUnits(item: PosStockFields): number | null {
  if (!item.trackInventory) return null;

  const base = item.availableStockBase;
  const bridgeRaw = item.stockBaseQtyPerCountSaleUnit;
  const bridge =
    bridgeRaw != null && bridgeRaw !== "" ? Number(bridgeRaw) : Number.NaN;
  const hasBridge = Number.isFinite(bridge) && bridge > 0;
  const sale = item.availableStock;

  // Puente conteo (p. ej. g por bolsa): siempre mostrar stock en unidad de venta.
  if (hasBridge && base != null) {
    return base / bridge;
  }

  if (sale != null) return sale;
  return base;
}

function stockHasFraction(qty: number): boolean {
  return Math.abs(qty - Math.trunc(qty)) > 1e-9;
}

/** Cantidad de stock con coma decimal (es-CL) cuando aplica. */
function formatStockQuantityNumber(qty: number, allowDecimals: boolean): string {
  if (!allowDecimals && !stockHasFraction(qty)) {
    return String(Math.trunc(qty));
  }
  const formatted = new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
    useGrouping: false,
  }).format(qty);
  // Asegurar coma si el runtime usa punto (p. ej. en-US).
  return formatted.includes(".") && !formatted.includes(",")
    ? formatted.replace(".", ",")
    : formatted;
}

export function posFormatStockQuantity(item: PosStockFields): string | null {
  const qty = posResolveAvailableStockInSaleUnits(item);
  if (qty == null || !Number.isFinite(qty)) return null;
  const allowDecimals = item.unitAllowDecimals === true || stockHasFraction(qty);
  return formatStockQuantityNumber(qty, allowDecimals);
}

/** Superficie visual (card / panel) cuando la línea supera stock disponible. */
export const POS_INSUFFICIENT_STOCK_SURFACE_CLASS =
  "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/35";

/** Fondo de alerta en filas de lista (sin borde, para no desalinear el ancho). */
export const POS_INSUFFICIENT_STOCK_LINE_CLASS = "bg-red-50 dark:bg-red-950/35";

/** Línea del carrito vinculada a una cotización cargada (precio/cantidad del snapshot). */
export const POS_QUOTATION_LINE_SURFACE_CLASS =
  "border-sky-300/70 bg-sky-50 dark:border-sky-800/50 dark:bg-sky-950/35";

/** True si la cantidad del carrito supera el stock efectivo (unidad de venta). */
export function posCartQuantityExceedsAvailableStock(
  line: PosStockFields & {
    quantity: number;
    productType?: string | null;
    metadata?: Record<string, unknown> | null;
  },
): boolean {
  // PREPARADO de cuenta dining: se prepara bajo pedido (CTP en menú/fire), no stock de terminado.
  const fromDining = line.metadata?.sourceDiningOrder === true;
  const productType = String(line.productType ?? "").trim().toUpperCase();
  if (fromDining && productType === "PREPARADO") {
    return false;
  }
  if (!line.trackInventory) return false;
  const effective = posResolveEffectiveStockInSaleUnits(line);
  if (effective == null || !Number.isFinite(effective)) return false;
  const qty = Number(line.quantity);
  if (!Number.isFinite(qty) || qty <= 0) return false;
  return qty > effective + 1e-9;
}

/** Texto para la fila «Stock: …» en cards (cantidad en unidad de venta). */
export function posFormatStockForCard(
  item: PosStockFields &
    Pick<PosProductSearchItem, "unitSymbol" | "stockBaseUnitSymbol" | "saleUnitSymbol"> & {
      metadata?: Record<string, unknown> | null;
    },
): string {
  if (!item.trackInventory) return "—";

  const reserved = posGetReservedQtyForFulfillLine(item);
  if (reserved != null) {
    const allowDecimals = item.unitAllowDecimals === true || stockHasFraction(reserved);
    const qtyStr = formatStockQuantityNumber(reserved, allowDecimals);
    const unit = posDisplaySaleUnitSymbol(item);
    const amount = unit ? `${qtyStr} ${unit}` : qtyStr;
    return `Reservado: ${amount}`;
  }

  const qty = posFormatStockQuantity(item);
  if (qty == null) return "—";
  const unit = posDisplaySaleUnitSymbol(item);
  return unit ? `${qty} ${unit}` : qty;
}

export function InlineSepDot() {
  return (
    <span
      aria-hidden
      className="inline-block h-1.25 w-1.25 shrink-0 rounded-full bg-secondary align-middle"
    />
  );
}

export function formatMoney(amount: number): string {
  try {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(
      Math.round(amount),
    );
  } catch {
    return String(Math.round(amount));
  }
}

function attributeParts(attrs: PosProductAttribute[] | null | undefined): string[] {
  if (!attrs?.length) return [];
  return attrs.map((a) => String(a.attributeValue ?? "").trim()).filter(Boolean);
}

export function PosProductNameWithAttributes({
  name,
  attributes,
  className = "",
  attributeSeparator = "dot",
}: {
  name: string;
  attributes: PosProductAttribute[] | null | undefined;
  className?: string;
  /** `dot`: círculos · (default). `slash`: nombre / valor / valor */
  attributeSeparator?: "dot" | "slash";
}) {
  const parts = attributeParts(attributes);
  const label =
    attributeSeparator === "slash"
      ? [name, ...parts].filter(Boolean).join(" / ")
      : [name, ...parts].join(" · ");

  if (attributeSeparator === "slash") {
    return (
      <p className={`min-w-0 ${className}`.trim()} title={label}>
        {label}
      </p>
    );
  }

  return (
    <p className={`flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 ${className}`.trim()} title={label}>
      <span className="min-w-0">{name}</span>
      {parts.map((part, i) => (
        <span key={`${i}-${part}`} className="inline-flex min-w-0 items-center gap-x-1.5">
          <InlineSepDot />
          <span className="shrink-0">{part}</span>
        </span>
      ))}
    </p>
  );
}
