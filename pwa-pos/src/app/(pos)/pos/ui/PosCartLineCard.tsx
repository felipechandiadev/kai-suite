"use client";

import { useEffect, useMemo, useState } from "react";
import { getPosVariantStockBreakdownAction } from "@/features/pos-products/actions/pos-products.action";
import type {
  PosProductSearchItem,
  PosVariantStockByStorageRow,
} from "@/features/pos-products/types/pos-product.types";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/pos-api-failure";
import type { ResolvedLineDiscount } from "@/features/promotions/lib/discount-engine.types";
import {
  InlineSepDot,
  PosProductNameWithAttributes,
  POS_INSUFFICIENT_STOCK_SURFACE_CLASS,
  POS_QUOTATION_LINE_SURFACE_CLASS,
  posCartQuantityExceedsAvailableStock,
  posDisplaySaleUnitSymbol,
  posFormatStockForCard,
  posFormatStockQuantity,
} from "@/features/pos-products/ui/posProductPreview";
import { PosNoDteBadge } from "@/features/pos-products/ui/PosNoDteBadge";
import { parseClpCurrencyInput } from "@/features/pos-cart/lib/apply-cart-line-unit-gross-price";
import { IconButton } from "@kai/ui";
import { Alert, Badge, Button, Dialog, TextField } from "@kai/ui";
import { listActivePosInventoryReservationsAction } from "@/features/pos-inventory-reservations/actions/list-active-reservations.action";
import { PosDiningTransferLineDialog } from "@/features/dining/ui/PosDiningTransferLineDialog";

/**
 * Línea del carrito en el POS. `discount` es opcional y lo asigna el
 * motor de promociones (PR 4): cuando está presente, la línea muestra
 * el descuento aplicado y el cierre de venta lo persiste como
 * `TransactionLine.discountAmount`.
 */
export type PosCartLine = PosProductSearchItem & {
  quantity: number;
  discount?: ResolvedLineDiscount | null;
  /** Lista de precios con la que se agregó la línea (invariante: una por carrito). */
  priceListId?: string;
  priceListName?: string;
};

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
}

export default function PosCartLineCard({
  line,
  pointOfSaleId,
  onIncrement,
  onDecrement,
  onRemove,
  onSetQuantity,
  onSetUnitPrice,
  maxQuantity,
  maxQuantityContext,
  isQuotationLine = false,
  readOnly = false,
  allowPriceEdit = false,
  enableDiningTransfer = false,
  branchId,
}: {
  line: PosCartLine;
  pointOfSaleId: string;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove?: () => void;
  onSetQuantity: (nextQuantity: number) => void;
  onSetUnitPrice?: (unitPriceWithTax: number) => void;
  /** Tope de cantidad (p. ej. liquidación de reserva o devolución). */
  maxQuantity?: number;
  /** Contexto del tope para mensajes en el diálogo de cantidad. */
  maxQuantityContext?: "return" | "backorder" | "quotation";
  /** Línea incluida en una cotización vinculada (fondo celeste). */
  isQuotationLine?: boolean;
  /** Bloquea toda edición de cantidad (modo liquidar encargo). */
  readOnly?: boolean;
  allowPriceEdit?: boolean;
  /** KaiFood: muestra icono para transferir línea a cuenta salón. */
  enableDiningTransfer?: boolean;
  branchId?: string;
}) {
  const code = line.barcode?.trim() || line.sku?.trim() || "—";
  const saleUnitLabel = posDisplaySaleUnitSymbol(line);
  const stockLabel = posFormatStockForCard(line);
  const allowDecimals = line.unitAllowDecimals === true;
  const [qtyDialogOpen, setQtyDialogOpen] = useState(false);
  const [qtyDraft, setQtyDraft] = useState("");
  const [qtyError, setQtyError] = useState<string | null>(null);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [priceDraft, setPriceDraft] = useState("");
  const [priceError, setPriceError] = useState<string | null>(null);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const [stockBreakdown, setStockBreakdown] = useState<PosVariantStockByStorageRow[]>([]);
  const [stockTrackInventory, setStockTrackInventory] = useState(true);
  const [reservationsDialogOpen, setReservationsDialogOpen] = useState(false);
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [reservationsError, setReservationsError] = useState<string | null>(null);
  const [reservationsStorage, setReservationsStorage] = useState<{
    storageId: string;
    storageName: string;
  } | null>(null);
  const [reservations, setReservations] = useState<
    Array<{
      id: string;
      customerName: string;
      quantity: number;
      quantityInBase?: number;
      createdAt: string;
      orderReference?: string;
      notes?: string;
      isExpired: boolean;
    }>
  >([]);

  const [transferOpen, setTransferOpen] = useState(false);

  useEffect(() => {
    if (!stockDialogOpen) return;
    setStockError(null);
    setStockBreakdown([]);
    setStockLoading(true);
    void (async () => {
      const res = await getPosVariantStockBreakdownAction({
        variantId: line.variantId,
        pointOfSaleId: pointOfSaleId?.trim() || undefined,
      });
      setStockLoading(false);
      if (!res.success) {
        if (redirectToLoginIfUnauthorized(res)) return;
        setStockError(res.message);
        return;
      }
      setStockTrackInventory(res.trackInventory);
      setStockBreakdown(res.breakdown);
    })();
  }, [stockDialogOpen, line.variantId, pointOfSaleId]);

  useEffect(() => {
    if (!reservationsDialogOpen || !reservationsStorage) return;
    setReservationsError(null);
    setReservations([]);
    setReservationsLoading(true);
    void (async () => {
      const res = await listActivePosInventoryReservationsAction({
        storageId: reservationsStorage.storageId,
        variantId: line.variantId,
      });
      setReservationsLoading(false);
      if (!res.success) {
        setReservationsError(res.message);
        return;
      }
      setReservations(
        res.reservations.map((r) => ({
          id: r.id,
          customerName: r.customerName,
          quantity: Number(r.quantity) || 0,
          quantityInBase:
            r.quantityInBase === null || r.quantityInBase === undefined
              ? undefined
              : Number(r.quantityInBase),
          createdAt: r.createdAt,
          orderReference: r.orderReference,
          notes: r.notes,
          isExpired: r.isExpired,
        })),
      );
    })();
  }, [reservationsDialogOpen, reservationsStorage, line.variantId]);

  const formatBreakdownQty = (row: PosVariantStockByStorageRow): string => {
    const qty = posFormatStockQuantity({
      trackInventory: stockTrackInventory,
      availableStock: row.availableStock,
      availableStockBase: row.availableStockBase,
      stockBaseQtyPerCountSaleUnit: line.stockBaseQtyPerCountSaleUnit,
      unitAllowDecimals: line.unitAllowDecimals,
    });
    if (!qty) return "—";
    return saleUnitLabel ? `${qty} ${saleUnitLabel}` : qty;
  };

  const formatBreakdownReserved = (row: PosVariantStockByStorageRow): string => {
    const qty = posFormatStockQuantity({
      trackInventory: stockTrackInventory,
      availableStock: row.reservedStock,
      availableStockBase: row.reservedStockBase,
      stockBaseQtyPerCountSaleUnit: line.stockBaseQtyPerCountSaleUnit,
      unitAllowDecimals: line.unitAllowDecimals,
    });
    if (!qty) return "—";
    return saleUnitLabel ? `${qty} ${saleUnitLabel}` : qty;
  };

  const formatBreakdownPhysical = (row: PosVariantStockByStorageRow): string => {
    const qty = posFormatStockQuantity({
      trackInventory: stockTrackInventory,
      availableStock: row.physicalStock,
      availableStockBase: row.physicalStockBase,
      stockBaseQtyPerCountSaleUnit: line.stockBaseQtyPerCountSaleUnit,
      unitAllowDecimals: line.unitAllowDecimals,
    });
    if (!qty) return "—";
    return saleUnitLabel ? `${qty} ${saleUnitLabel}` : qty;
  };

  useEffect(() => {
    if (!qtyDialogOpen) return;
    setQtyError(null);
    setQtyDraft(String(line.quantity ?? ""));
    const timer = window.setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>(
        '[data-test-id="pos-cart-line-edit-qty-input"]',
      );
      if (!el) return;
      el.focus({ preventScroll: true });
      el.select();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [qtyDialogOpen, line.quantity]);

  useEffect(() => {
    if (!priceDialogOpen) return;
    setPriceError(null);
    setPriceDraft(String(Math.round(Number(line.unitPriceWithTax) || 0)));
    const timer = window.setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>(
        '[data-test-id="pos-cart-line-edit-price-input"]',
      );
      if (!el) return;
      el.focus({ preventScroll: true });
      el.select();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [priceDialogOpen, line.unitPriceWithTax]);

  const quantityLabel = useMemo(() => {
    if (allowDecimals) {
      return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 }).format(
        Number(line.quantity) || 0,
      );
    }
    return String(Math.max(0, Math.trunc(Number(line.quantity) || 0)));
  }, [allowDecimals, line.quantity]);

  const parseDraftQuantity = (): number | null => {
    const raw = qtyDraft.trim().replace(",", ".");
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    if (!allowDecimals && !Number.isInteger(n)) return null;
    return n;
  };

  const saveQty = () => {
    setQtyError(null);
    const n = parseDraftQuantity();
    if (n == null) {
      setQtyError(allowDecimals ? "Ingresa una cantidad válida." : "Ingresa una cantidad entera válida.");
      return;
    }
    if (
      maxQuantity != null &&
      Number.isFinite(maxQuantity) &&
      n > maxQuantity + (allowDecimals ? 0.0001 : 0)
    ) {
      const maxLabel = allowDecimals
        ? String(maxQuantity)
        : String(Math.round(maxQuantity));
      setQtyError(
        maxQuantityContext === "return"
          ? `No puedes devolver más de ${maxLabel} unidades (máximo según la venta original).`
          : maxQuantityContext === "quotation"
            ? `No puedes superar ${maxLabel} unidades (máximo de la cotización).`
            : `La cantidad no puede superar ${maxLabel}.`,
      );
      return;
    }
    const capped =
      maxQuantity != null && Number.isFinite(maxQuantity) ? Math.min(n, maxQuantity) : n;
    onSetQuantity(capped);
    setQtyDialogOpen(false);
  };

  const savePrice = () => {
    setPriceError(null);
    const n = parseClpCurrencyInput(priceDraft);
    if (n == null) {
      setPriceError("Ingresa un precio válido mayor a cero.");
      return;
    }
    onSetUnitPrice?.(n);
    setPriceDialogOpen(false);
  };

  const atMaxQty =
    maxQuantity != null &&
    Number.isFinite(maxQuantity) &&
    (Number(line.quantity) || 0) >= maxQuantity;

  const lineGross = (Number(line.unitPriceWithTax) || 0) * (Number(line.quantity) || 0);
  const lineDiscount = line.discount?.discountAmount ?? 0;
  const lineSubtotal = Math.max(0, lineGross - lineDiscount);
  const exceedsAvailableStock = posCartQuantityExceedsAvailableStock(line);

  return (
    <article
      className={`rounded-xl border p-4 shadow-sm ${
        exceedsAvailableStock
          ? POS_INSUFFICIENT_STOCK_SURFACE_CLASS
          : isQuotationLine
            ? POS_QUOTATION_LINE_SURFACE_CLASS
            : "border-border bg-surface"
      }`}
      data-test-id="pos-cart-line"
      data-stock-exceeded={exceedsAvailableStock ? "true" : undefined}
      data-quotation-line={isQuotationLine ? "true" : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 text-sm">
          <div className="flex items-start gap-1">
            {line.trackInventory ? (
              <IconButton
                icon="Info"
                variant="neutral"
                size="xs"
                className="shrink-0"
                ariaLabel="Ver stock por almacén"
                title="Stock por almacén"
                onClick={() => setStockDialogOpen(true)}
                data-test-id="pos-cart-line-stock-info"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <PosProductNameWithAttributes
                name={line.productName}
                attributes={line.attributes}
                className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 font-mono text-[11px] text-muted-foreground">
            <span>SKU {line.sku ?? "—"}</span>
            {code && code !== "—" ? (
              <>
                <InlineSepDot />
                <span>{code}</span>
              </>
            ) : null}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-1.5">
            {allowPriceEdit && onSetUnitPrice && !readOnly ? (
              <IconButton
                icon="Pencil"
                variant="action"
                size="xs"
                className="shrink-0"
                ariaLabel="Editar precio de venta"
                title="Editar precio"
                onClick={() => setPriceDialogOpen(true)}
                data-test-id="pos-cart-line-edit-price"
              />
            ) : null}
            <span className="font-medium text-foreground">
              {formatMoney(line.unitPriceWithTax)}
            </span>
            {saleUnitLabel ? (
              <>
                <InlineSepDot />
                <span className="text-xs text-muted-foreground">{saleUnitLabel}</span>
              </>
            ) : null}
            <InlineSepDot />
            <span className="font-mono text-[11px] text-muted-foreground">
              Stock:{" "}
              <span className="font-semibold text-foreground">{stockLabel}</span>
            </span>
            {line.priceListName?.trim() || line.priceListId?.trim() ? (
              <span
                className="inline-flex max-w-[10rem]"
                title={line.priceListName?.trim() || line.priceListId || undefined}
                data-test-id="pos-cart-line-price-list-badge"
              >
                <Badge variant="secondary-outlined" className="max-w-full truncate">
                  {line.priceListName?.trim() || "—"}
                </Badge>
              </span>
            ) : null}
            <PosNoDteBadge requiresDte={line.requiresDte} />
          </div>
          {line.discount ? (
            <div
              className="mt-2 inline-flex items-center gap-2 rounded-md bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              data-test-id="pos-cart-line-discount-badge"
              title={`${line.discount.promotionCode}: -${formatMoney(line.discount.discountAmount)}`}
            >
              <span className="font-semibold">Promo</span>
              <span>{line.discount.promotionName}</span>
              <span className="tabular-nums">
                -{formatMoney(line.discount.discountAmount)}
              </span>
            </div>
          ) : null}
        </div>
        <div className="grid shrink-0 grid-cols-1 items-start gap-2">
          {/* Columna izquierda: subtotal + acciones */}
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] font-medium text-muted-foreground">Subtotal</span>
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {formatMoney(Math.round(lineSubtotal))}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-1 rounded-lg border border-border bg-neutral px-1 py-0.5">
                <button
                  type="button"
                  className="rounded px-2 py-1 text-lg leading-none text-foreground hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={onDecrement}
                  disabled={readOnly}
                  aria-label="Disminuir cantidad"
                >
                  −
                </button>
                <span className="min-w-[2ch] text-center text-sm font-semibold tabular-nums">{quantityLabel}</span>
                <button
                  type="button"
                  className="rounded px-2 py-1 text-lg leading-none text-foreground hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={onIncrement}
                  disabled={atMaxQty || readOnly}
                  aria-label="Aumentar cantidad"
                >
                  +
                </button>
                {!readOnly ? (
                  <IconButton
                    icon="Pencil"
                    variant="action"
                    size="xs"
                    ariaLabel="Editar cantidad"
                    title="Editar cantidad"
                    onClick={() => setQtyDialogOpen(true)}
                    data-test-id="pos-cart-line-edit-qty"
                  />
                ) : null}
                {onRemove && !readOnly ? (
                  <IconButton
                    icon="Trash2"
                    variant="action"
                    size="xs"
                    ariaLabel="Eliminar producto del carrito"
                    title="Eliminar"
                    onClick={onRemove}
                    data-test-id="pos-cart-line-remove"
                  />
                ) : null}
                {enableDiningTransfer && branchId?.trim() && !readOnly ? (
                  <IconButton
                    icon="UtensilsCrossed"
                    variant="action"
                    size="xs"
                    ariaLabel="Transferir a cuenta salón"
                    title="Transferir a cuenta"
                    onClick={() => setTransferOpen(true)}
                    data-test-id="pos-cart-line-dining-transfer"
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={stockDialogOpen}
        onClose={() => setStockDialogOpen(false)}
        title="Stock por almacén"
        size="sm"
        alertArea={
          stockError ? <Alert variant="error">{stockError}</Alert> : undefined
        }
        actions={
          <Button type="button" variant="primary" onClick={() => setStockDialogOpen(false)}>
            Cerrar
          </Button>
        }
        actionsJustify="end"
        data-test-id="pos-cart-line-stock-dialog"
      >
        <div className="grid gap-2 text-sm">
          {stockLoading ? (
            <p className="text-muted-foreground">Cargando…</p>
          ) : !stockTrackInventory ? (
            <p className="text-muted-foreground">Este producto no controla inventario.</p>
          ) : stockBreakdown.length === 0 ? (
            <p className="text-muted-foreground">Sin stock en almacenes.</p>
          ) : (
            <ul className="max-h-[min(16rem,50vh)] space-y-2 overflow-y-auto pr-1">
              {stockBreakdown.map((row) => (
                <li
                  key={row.storageId}
                  className={`rounded-lg border px-3 py-2 ${
                    row.isPosStorage
                      ? "border-secondary/40 bg-secondary/10"
                      : "border-border"
                  }`}
                  data-test-id={`pos-cart-stock-row-${row.storageId}`}
                  data-pos-storage={row.isPosStorage ? "true" : undefined}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{row.storageName || "—"}</p>
                      {row.branchName ? (
                        <p className="text-xs text-muted-foreground">{row.branchName}</p>
                      ) : null}
                      {row.isPosStorage ? (
                        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-secondary">
                          Sala de venta (POS)
                        </p>
                      ) : null}
                    </div>
                    <div className="grid shrink-0 gap-0.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[10px] text-muted-foreground">Físico</span>
                        <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                          {formatBreakdownPhysical(row)}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[10px] text-muted-foreground">Reservado</span>
                        <div className="flex items-center gap-1">
                          {stockTrackInventory && (Number(row.reservedStock ?? 0) > 0 || Number(row.reservedStockBase ?? 0) > 0) ? (
                            <IconButton
                              icon="Info"
                              variant="neutral"
                              size="xs"
                              ariaLabel="Ver detalle de reservas"
                              title="Ver detalle de reservas"
                              onClick={() => {
                                setReservationsStorage({
                                  storageId: row.storageId,
                                  storageName: row.storageName || "—",
                                });
                                setReservationsDialogOpen(true);
                              }}
                              data-test-id={`pos-cart-stock-reserved-detail-${row.storageId}`}
                            />
                          ) : null}
                          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                            {formatBreakdownReserved(row)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[10px] text-muted-foreground">Disponible</span>
                        <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                          {formatBreakdownQty(row)}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Dialog>

      <Dialog
        open={reservationsDialogOpen}
        onClose={() => {
          setReservationsDialogOpen(false);
          setReservationsStorage(null);
        }}
        title={`Reservas — ${reservationsStorage?.storageName ?? "Almacén"}`}
        size="md"
        alertArea={
          reservationsError ? <Alert variant="error">{reservationsError}</Alert> : undefined
        }
        actions={
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              setReservationsDialogOpen(false);
              setReservationsStorage(null);
            }}
          >
            Cerrar
          </Button>
        }
        actionsJustify="end"
        data-test-id="pos-cart-line-reservations-dialog"
      >
        <div className="grid gap-2 text-sm">
          {reservationsLoading ? (
            <p className="text-muted-foreground">Cargando…</p>
          ) : reservations.length === 0 ? (
            <p className="text-muted-foreground">Sin reservas activas.</p>
          ) : (
            <ul className="max-h-[min(18rem,60vh)] space-y-2 overflow-y-auto pr-1">
              {reservations.map((r) => (
                <li
                  key={r.id}
                  className={`rounded-lg border px-3 py-2 ${
                    r.isExpired ? "border-border bg-muted/30 opacity-70" : "border-border"
                  }`}
                  data-test-id={`pos-cart-reservation-${r.id}`}
                  data-expired={r.isExpired ? "true" : undefined}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{r.customerName || "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.orderReference ? `Ref: ${r.orderReference}` : "—"}
                        {r.notes ? ` · ${r.notes}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
                        {new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 }).format(r.quantity)}
                        {saleUnitLabel ? ` ${saleUnitLabel}` : ""}
                      </p>
                    {r.quantityInBase != null && line.stockBaseUnitSymbol ? (
                      <p className="text-[10px] text-muted-foreground">
                        {new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 }).format(r.quantityInBase)}{" "}
                        {line.stockBaseUnitSymbol}
                      </p>
                    ) : null}
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString("es-CL")}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Dialog>

      <Dialog
        open={qtyDialogOpen}
        onClose={() => setQtyDialogOpen(false)}
        title="Editar cantidad"
        size="sm"
        alertArea={qtyError ? <Alert variant="error">{qtyError}</Alert> : undefined}
        actions={
          <>
            <Button type="button" variant="outlined" onClick={() => setQtyDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="primary" onClick={saveQty}>
              Guardar
            </Button>
          </>
        }
        actionsJustify="between"
        data-test-id="pos-cart-line-edit-qty-dialog"
      >
        <div className="grid gap-3">
          <TextField
            label="Cantidad"
            name="pos-cart-edit-qty"
            type="number"
            value={qtyDraft}
            onChange={(e) => setQtyDraft(e.target.value)}
            placeholder="Cantidad"
            alwaysShowLabel
            selectOnFocus
            autoFocus
            min={allowDecimals ? 0.001 : 1}
            step={allowDecimals ? 0.001 : 1}
            inputMode={allowDecimals ? "decimal" : "numeric"}
            data-test-id="pos-cart-line-edit-qty-input"
          />
          <p className="text-xs text-muted-foreground">
            {allowDecimals
              ? "Esta unidad permite decimales."
              : "Esta unidad solo permite cantidades enteras."}
            {maxQuantity != null && Number.isFinite(maxQuantity) ? (
              <>
                {" "}
                {maxQuantityContext === "return"
                  ? `Máximo devolvable: ${allowDecimals ? maxQuantity : Math.round(maxQuantity)}.`
                  : maxQuantityContext === "quotation"
                    ? `Máximo cotizado: ${allowDecimals ? maxQuantity : Math.round(maxQuantity)}.`
                    : `Máximo: ${allowDecimals ? maxQuantity : Math.round(maxQuantity)}.`}
              </>
            ) : null}
          </p>
        </div>
      </Dialog>

      <Dialog
        open={priceDialogOpen}
        onClose={() => setPriceDialogOpen(false)}
        title="Editar precio de venta"
        size="sm"
        alertArea={priceError ? <Alert variant="error">{priceError}</Alert> : undefined}
        actions={
          <>
            <Button type="button" variant="outlined" onClick={() => setPriceDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="primary" onClick={savePrice}>
              Guardar
            </Button>
          </>
        }
        actionsJustify="between"
        data-test-id="pos-cart-line-edit-price-dialog"
      >
        <div className="grid gap-3">
          <TextField
            label="Precio unitario (con IVA)"
            name="pos-cart-edit-price"
            type="currency"
            currencySymbol="$"
            value={priceDraft}
            onChange={(e) => setPriceDraft(e.target.value)}
            placeholder="Precio"
            alwaysShowLabel
            selectOnFocus
            autoFocus
            data-test-id="pos-cart-line-edit-price-input"
          />
          <p className="text-xs text-muted-foreground">
            Aplica solo a esta venta. El impuesto se recalcula según la tasa del producto.
          </p>
        </div>
      </Dialog>

      {enableDiningTransfer && branchId?.trim() ? (
        <PosDiningTransferLineDialog
          open={transferOpen}
          onClose={() => setTransferOpen(false)}
          line={line}
          branchId={branchId}
          onSuccess={() => onRemove?.()}
        />
      ) : null}
    </article>
  );
}
