"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchPointOfSalePriceListsAction } from "@/features/session/actions/point-of-sale-pos.action";
import { validatePosEntryAction } from "@/features/session/actions/cash-session.action";
import { shouldUseBackendApi } from "@/features/pos-offline/infrastructure/connectivity";
import {
  clearPosContextClient,
  patchPosContextClient,
  readPosContextClient,
  type PosContextV1,
  type PosPriceListSnapshot,
} from "@/features/session/lib/pos-context-storage";
import { Alert, Button, Dialog, DotProgress, IconButton } from "@kai/ui";
import { ShoppingCart } from "lucide-react";
import { createPresaleTicketAction } from "@/features/presale-tickets/actions/presale-tickets.action";
import { printPresaleTicketAgentOrBrowser } from "@/features/presale-tickets/lib/presale-ticket-agent";
import type { PresaleTicketDetail } from "@/features/presale-tickets/types/presale-ticket.types";
import PosProductSearchPanel, {
  POS_PRODUCT_SEARCH_PANEL_HEIGHT_VH,
  type PosProductSearchPanelHandle,
} from "./PosProductSearchPanel";
import PosBarcodeScanner from "@/features/pos-products/ui/PosBarcodeScanner";
import PosCartLineCard from "./PosCartLineCard";
import { isQuotationCartVariant, usePosCart } from "@/features/pos-cart/PosCartProvider";
import { computePosSaleTotals } from "@/features/pos-cart/lib/pos-sale-totals";
import { PosDiscountDetailDialog } from "@/features/promotions/ui/PosDiscountDetailDialog";
import { LoadQuotationDialog } from "./LoadQuotationDialog";
import { LoadReturnSaleDialog } from "./LoadReturnSaleDialog";
import { LoadBackorderDialog } from "./LoadBackorderDialog";
import { runPendingCashSessionOpeningPrintIfAny } from "@/features/cash-session-opening/lib/run-pending-cash-session-opening-print";
import { requestPosProductSearchFocus } from "@/features/pos-products/lib/pos-product-search-focus";
import {
  readPosProductSearchCameraEnabled,
  writePosProductSearchCameraEnabled,
} from "@/features/pos-products/lib/posProductSearchStorage";
import { usePosCompactLayout } from "@/shared/hooks/usePosCompactLayout";
import { usePosOffline } from "@/features/pos-offline/hooks/use-pos-offline";
import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";
import PosPaymentWorkspace from "@/app/(pos)/pos/payment/ui/PosPaymentWorkspace";
import { POS_CUSTOMER_SEARCH_DEFAULT_PAGE_SIZE } from "@/features/customers/lib/posCustomerSearchStorage";
import type { PosCustomerSearchInitial } from "@/features/customers/ui/PosCustomerSearchPanel";
import { isKaiFoodEnabled } from "@/config/kaifood-module.config";

const emptyCustomerSearch: PosCustomerSearchInitial = {
  query: "",
  page: 1,
  pageSize: POS_CUSTOMER_SEARCH_DEFAULT_PAGE_SIZE,
  items: [],
  total: 0,
  error: null,
};

type MobilePanel = "products" | "cart";
function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(
    Math.round(n),
  );
}

export default function PosWorkspace() {
  const router = useRouter();
  const compactLayout = usePosCompactLayout();
  const productSearchRef = useRef<PosProductSearchPanelHandle>(null);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("products");
  const [cameraEnabled, setCameraEnabled] = useState(() => readPosProductSearchCameraEnabled());
  const [ctx, setCtx] = useState<PosContextV1 | null>(null);
  const [priceListId, setPriceListId] = useState("");
  const [priceListOptions, setPriceListOptions] = useState<PosPriceListSnapshot[]>([]);
  const cart = usePosCart();
  const { isOffline } = usePosOffline();
  const [loadQuotationOpen, setLoadQuotationOpen] = useState(false);
  const [loadReturnOpen, setLoadReturnOpen] = useState(false);
  const [loadBackorderOpen, setLoadBackorderOpen] = useState(false);
  const [presaleBusy, setPresaleBusy] = useState(false);
  const [presaleError, setPresaleError] = useState("");
  const [lastPresaleTicket, setLastPresaleTicket] = useState<PresaleTicketDetail | null>(null);
  const [embeddedPaymentOpen, setEmbeddedPaymentOpen] = useState(false);
  const [discountDetailOpen, setDiscountDetailOpen] = useState(false);
  const isReturnMode = cart.isReturnMode;
  const isFulfillBackorderMode = cart.isFulfillBackorderMode;
  const hasLoadedQuotation = cart.loadedQuotation != null;
  const quotationsEnabled = cart.quotationsEnabled;
  const isPresaleMode = ctx?.posKind === "PRESALE";
  const cartLocked = isReturnMode || isFulfillBackorderMode;
  const kaiFoodEnabled = isKaiFoodEnabled();
  const diningTransferEnabled =
    kaiFoodEnabled &&
    !isOffline &&
    !cartLocked &&
    !hasLoadedQuotation &&
    cart.loadedDiningOrder == null;

  const refreshPriceListOptions = useCallback(async (posId: string, currentListId?: string) => {
    if (!shouldUseBackendApi()) return;
    try {
      const res = await fetchPointOfSalePriceListsAction(posId);
      if (!res.success) {
        return;
      }

    if (res.branchId) {
      patchPosContextClient({
        branchId: res.branchId,
        branchName: res.branchName ?? null,
        storageId: res.storageId ?? null,
        pointOfSaleName: res.pointOfSaleName ?? null,
      });
      setCtx(readPosContextClient());
    }

    if (res.priceLists.length === 0) {
      return;
    }
    setPriceListOptions(res.priceLists);
    patchPosContextClient({ priceLists: res.priceLists });

    const preferred =
      (currentListId && res.priceLists.some((p) => p.id === currentListId)
        ? currentListId
        : null) ??
      (res.defaultPriceListId && res.priceLists.some((p) => p.id === res.defaultPriceListId)
        ? res.defaultPriceListId
        : null) ??
      res.priceLists[0]?.id ??
      "";

    if (preferred) {
      setPriceListId(preferred);
      patchPosContextClient({ priceListId: preferred });
    }
    } catch {
      /* offline o red inestable: conservar listas en contexto local */
    }
  }, []);

  useEffect(() => {
    const c = readPosContextClient();
    if (!c?.pointOfSaleId || !c?.priceListId) {
      router.replace("/session-setup");
      return;
    }

    void (async () => {
      if (shouldUseBackendApi()) {
        const validation = await validatePosEntryAction({
          pointOfSaleId: c.pointOfSaleId,
          cashSessionId: c.cashSessionId ?? null,
          posKind: c.posKind ?? null,
        });
        if (!validation.valid) {
          clearPosContextClient();
          router.replace("/session-setup");
          return;
        }
      }

      let res: Awaited<ReturnType<typeof fetchPointOfSalePriceListsAction>> | null = null;
      if (shouldUseBackendApi()) {
        try {
          res = await fetchPointOfSalePriceListsAction(c.pointOfSaleId);
        } catch {
          res = null;
        }
      }

      if (res?.success) {
        patchPosContextClient({
          ...(res.branchId ? { branchId: res.branchId, branchName: res.branchName ?? null } : {}),
          storageId: res.storageId ?? null,
          pointOfSaleName: res.pointOfSaleName ?? c.pointOfSaleName ?? null,
          posKind: res.posKind,
          acceptsPresaleTickets: res.acceptsPresaleTickets,
          deferredPaymentEnabled: res.deferredPaymentEnabled,
          ...(res.priceLists.length > 0 ? { priceLists: res.priceLists } : {}),
        });
      }

      const synced = readPosContextClient() ?? c;
      setCtx(synced);
      runPendingCashSessionOpeningPrintIfAny();
      const listId = String(synced.priceListId);
      setPriceListId(listId);
      if (synced.priceLists?.length) {
        setPriceListOptions(synced.priceLists);
      } else {
        setPriceListOptions([{ id: listId, name: "Lista de precios" }]);
      }
      if (res?.success && res.priceLists.length > 0) {
        const preferred =
          (listId && res.priceLists.some((p) => p.id === listId) ? listId : null) ??
          (res.defaultPriceListId && res.priceLists.some((p) => p.id === res.defaultPriceListId)
            ? res.defaultPriceListId
            : null) ??
          res.priceLists[0]?.id ??
          "";
        if (preferred && preferred !== listId) {
          setPriceListId(preferred);
          patchPosContextClient({ priceListId: preferred });
        }
      }
    })();
  }, [router]);

  useEffect(() => {
    requestPosProductSearchFocus();
  }, []);

  useEffect(() => {
    if (shouldUseBackendApi()) {
      router.prefetch("/pos/payment");
    }
  }, [router]);

  const branchId = ctx?.branchId?.trim() ? ctx.branchId.trim() : null;

  const [stockWarning, setStockWarning] = useState<string | null>(null);

  const addProduct = useCallback(
    (item: PosProductSearchItem) => {
      if (!shouldUseBackendApi() && item.trackInventory && item.availableStock != null) {
        const existing = cart.lines.find((l) => l.variantId === item.variantId);
        const nextQty = (existing?.quantity ?? 0) + 1;
        if (nextQty > item.availableStock) {
          setStockWarning(
            `Stock local bajo para ${item.productName} (${item.availableStock} disponibles). La venta puede fallar al sincronizar.`,
          );
        }
      }
      cart.addItem(item);
      if (compactLayout) {
        setMobilePanel("cart");
      }
    },
    [cart, compactLayout],
  );

  const saleTotals = useMemo(
    () => computePosSaleTotals(cart.lines, cart.orderDiscount ?? 0),
    [cart.lines, cart.orderDiscount],
  );
  const {
    net: totalsNet,
    taxes,
    lineDiscountsTotal,
    discounts,
    saleTotal,
  } = saleTotals;

  const presaleLinkedEmptyCart =
    !isPresaleMode &&
    cart.loadedPresaleTickets.length > 0 &&
    cart.lines.length === 0;

  const checkoutDisabled =
    cart.lines.length === 0 ||
    (isOffline && (isPresaleMode || isReturnMode || isFulfillBackorderMode));

  const checkoutTitle = useMemo(() => {
    if (isPresaleMode) return "Generar ticket";
    if (isReturnMode) return "Ir a devolución";
    if (isFulfillBackorderMode) return "Liquidar encargo";
    return "Ir a cobro";
  }, [isPresaleMode, isReturnMode, isFulfillBackorderMode]);

  const handleCameraEnabledChange = useCallback((enabled: boolean) => {
    writePosProductSearchCameraEnabled(enabled);
    setCameraEnabled(enabled);
  }, []);

  const handleCheckout = useCallback(async () => {
    if (!ctx?.pointOfSaleId || !priceListId) return;
    if (isPresaleMode) {
      setPresaleError("");
      setPresaleBusy(true);
      try {
        const lines = cart.lines.map((l) => {
          const qty = Number(l.quantity) || 0;
          const unitNet = Number(l.unitPrice) || 0;
          const unitGross = Number(l.unitPriceWithTax) || 0;
          const taxAmount = Math.round(Math.max(0, unitGross - unitNet) * qty);
          const total = Math.round(unitGross * qty);
          const discountAmount = l.discount?.discountAmount
            ? Math.round(l.discount.discountAmount)
            : 0;
          return {
            productId: l.productId || undefined,
            productVariantId: l.variantId || undefined,
            productName: l.productName,
            productSku: l.sku ?? undefined,
            quantity: qty,
            unitPrice: unitNet,
            discountAmount,
            taxRate: Number(l.unitTaxRate) || 0,
            taxAmount,
            subtotal: Math.round(unitNet * qty),
            total: total - discountAmount,
            promotionSnapshot: l.discount
              ? {
                  promotionId: l.discount.promotionId,
                  promotionCode: l.discount.promotionCode,
                  discountAmount: l.discount.discountAmount,
                }
              : undefined,
          };
        });
        const res = await createPresaleTicketAction({
          presalePointOfSaleId: ctx.pointOfSaleId,
          priceListId,
          lines,
          customerId: cart.saleCustomer?.customerId ?? undefined,
          customerName: cart.saleCustomer?.name,
          customerDocument: cart.saleCustomer?.document,
          subtotal: totalsNet,
          taxAmount: taxes,
          discountAmount: discounts,
          total: saleTotal,
          promotionsSnapshot: cart.appliedPromotions as unknown as Record<string, unknown>[],
        });
        if (!res.success) {
          setPresaleError(res.message);
          return;
        }
        void printPresaleTicketAgentOrBrowser(res.ticket, {
          companyName: ctx.pointOfSaleName,
        });
        setLastPresaleTicket(res.ticket);
        cart.clear();
      } finally {
        setPresaleBusy(false);
      }
      return;
    }
    if (isOffline) {
      setEmbeddedPaymentOpen(true);
      return;
    }
    router.push("/pos/payment");
  }, [
    cart,
    ctx,
    isOffline,
    isPresaleMode,
    lineDiscountsTotal,
    discounts,
    saleTotal,
    taxes,
    totalsNet,
    priceListId,
    router,
  ]);

  if (!ctx?.priceListId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-zinc-500">
        <DotProgress />
        Cargando contexto del punto de venta…
      </div>
    );
  }

  if (embeddedPaymentOpen) {
    return (
      <div className="flex min-h-0 flex-1 flex-col" data-test-id="pos-embedded-payment">
        <PosPaymentWorkspace
          initialCustomerSearch={emptyCustomerSearch}
          embedded
          onCloseEmbedded={() => setEmbeddedPaymentOpen(false)}
        />
      </div>
    );
  }

  const productPanel = (
    <PosProductSearchPanel
      ref={productSearchRef}
      priceListId={priceListId}
      priceListOptions={priceListOptions}
      branchId={branchId}
      pointOfSaleId={ctx.pointOfSaleId}
      onPriceListChange={setPriceListId}
      onRefreshPriceListOptions={() => refreshPriceListOptions(ctx.pointOfSaleId, priceListId)}
      onPickProduct={cartLocked ? undefined : addProduct}
      disabled={cartLocked}
      disabledHint={
        isFulfillBackorderMode
          ? "En liquidación de encargo no puedes agregar productos. Usa «Desvincular» para salir."
          : isReturnMode
            ? "En devolución solo puedes quitar líneas del carrito. Usa «Desvincular» para salir."
            : undefined
      }
      acceptsPresaleTickets={ctx.acceptsPresaleTickets === true && !isPresaleMode}
      compactLayout={compactLayout}
      cameraEnabled={cameraEnabled}
      onCameraEnabledChange={handleCameraEnabledChange}
    />
  );

  const cartPanel = (
    <aside
      className={`pos-workspace-panel flex min-h-0 w-full min-w-0 flex-col gap-3 rounded-xl border border-border bg-background p-3 sm:p-4 ${
        compactLayout ? "h-full" : ""
      }`}
      style={compactLayout ? undefined : { height: `${POS_PRODUCT_SEARCH_PANEL_HEIGHT_VH}vh` }}
      data-test-id="pos-cart-panel"
    >
        {stockWarning ? (
          <Alert variant="warning" className="shrink-0">
            {stockWarning}
          </Alert>
        ) : null}
        {cart.lastCartError ? (
          <Alert
            variant="error"
            className="shrink-0"
            data-test-id="pos-cart-price-list-error"
          >
            {cart.lastCartError}
          </Alert>
        ) : null}
        <div className="flex shrink-0 items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {quotationsEnabled && !isPresaleMode && !isOffline ? (
            <IconButton
              icon="File"
              variant="outlined"
              size="sm"
              onClick={() => setLoadQuotationOpen(true)}
              disabled={cartLocked}
              ariaLabel="Cotización"
              title="Cargar cotización"
              data-test-id="pos-load-quotation-btn"
              className="shrink-0"
            />
            ) : null}
            {!isPresaleMode && !isOffline ? (
            <IconButton
              icon="RotateCcw"
              variant="outlined"
              size="sm"
              onClick={() => setLoadReturnOpen(true)}
              disabled={(isReturnMode || isFulfillBackorderMode) && cart.lines.length > 0}
              ariaLabel="Devolución"
              title={
                isFulfillBackorderMode && cart.lines.length > 0
                  ? "Desvincule el encargo actual para cargar una devolución"
                  : isReturnMode && cart.lines.length > 0
                    ? "Desvincule la devolución actual para cargar otra venta"
                    : "Cargar venta origen para devolución"
              }
              data-test-id="pos-load-return-btn"
              className="shrink-0"
            />
            ) : null}
            {!isPresaleMode && !isOffline ? (
            <IconButton
              icon="Package"
              variant="outlined"
              size="sm"
              onClick={() => setLoadBackorderOpen(true)}
              disabled={isFulfillBackorderMode && cart.lines.length > 0}
              ariaLabel="Encargo"
              title={
                isFulfillBackorderMode && cart.lines.length > 0
                  ? "Desvincule el encargo actual para cargar otro"
                  : "Cargar encargo abierto para liquidar"
              }
              data-test-id="pos-load-backorder-btn"
              className="shrink-0"
            />
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-zinc-500" data-test-id="pos-cart-items-count">
              {cart.itemsCount} ítems
            </p>
            <ShoppingCart
              size={18}
              strokeWidth={2}
              className="shrink-0 text-primary"
              aria-hidden
              data-test-id="pos-cart-icon"
            />
          </div>
        </div>

        {cart.loadedPresaleTickets.map((ticket) => (
          <div
            key={ticket.id}
            className="flex shrink-0 items-center justify-between gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs"
            data-test-id="pos-cart-presale-banner"
          >
            <div className="min-w-0">
              <p>
                Cargado desde ticket <strong>{ticket.code}</strong>
              </p>
              <p className="mt-0.5 text-muted-foreground">
                Puedes editar el carrito libremente.
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => cart.detachPresaleTicket(ticket.id)}
            >
              Desvincular
            </button>
          </div>
        ))}

        {cart.loadedBackorder ? (
          <div
            className="flex shrink-0 items-center justify-between gap-2 rounded-lg border border-secondary/50 bg-secondary/10 px-3 py-2 text-xs"
            data-test-id="pos-cart-backorder-banner"
          >
            <div>
              <span className="text-muted-foreground">Liquidar encargo:</span>{" "}
              <span className="font-mono font-semibold">
                {cart.loadedBackorder.documentNumber}
              </span>
              <span className="ml-2 text-muted-foreground">
                Abono {formatMoney(cart.loadedBackorder.depositAvailable)}
              </span>
            </div>
            <button
              type="button"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => cart.exitFulfillBackorderMode()}
              data-test-id="pos-cart-backorder-detach"
            >
              Desvincular
            </button>
          </div>
        ) : null}

        {cart.loadedReturnSale ? (
          <div
            className="flex shrink-0 items-center justify-between gap-2 rounded-lg border border-warning/50 bg-warning/10 px-3 py-2 text-xs"
            data-test-id="pos-cart-return-banner"
          >
            <div>
              <span className="text-muted-foreground">Devolución — venta:</span>{" "}
              <span className="font-mono font-semibold">
                {cart.loadedReturnSale.documentNumber}
              </span>
            </div>
            <button
              type="button"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => cart.exitReturnMode()}
              data-test-id="pos-cart-return-detach"
            >
              Desvincular
            </button>
          </div>
        ) : null}

        {quotationsEnabled && cart.loadedQuotation && !cartLocked ? (
          <div
            className="flex shrink-0 items-center justify-between gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-xs"
            data-test-id="pos-cart-quotation-banner"
          >
            <div>
              <span className="text-muted-foreground">Cotización cargada:</span>{" "}
              <span className="font-mono font-semibold">
                {cart.loadedQuotation.documentNumber}
              </span>
              {cart.loadedQuotation.expired ? (
                <span className="ml-2 rounded bg-warning/20 px-1.5 py-0.5 text-warning">
                  Vencida
                </span>
              ) : null}
            </div>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => cart.setLoadedQuotation(null)}
              data-test-id="pos-cart-quotation-detach"
            >
              Desvincular
            </button>
          </div>
        ) : null}
        <div
          className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1"
          data-test-id="pos-cart-lines-scroll"
        >
          {cart.lines.length === 0
            ? null
            : cart.lines.map((line) => {
              const isQuotationLine = isQuotationCartVariant(
                line.variantId,
                cart.loadedQuotation,
              );
              const quotationMax = hasLoadedQuotation
                ? cart.loadedQuotation?.lineMaxQtyByVariantId[line.variantId]
                : undefined;
              return (
              <PosCartLineCard
                key={line.variantId}
                line={line}
                pointOfSaleId={ctx.pointOfSaleId}
                onIncrement={() => cart.increment(line.variantId)}
                onDecrement={() => cart.decrement(line.variantId)}
                onRemove={
                  isFulfillBackorderMode ? undefined : () => cart.remove(line.variantId)
                }
                onSetQuantity={(q) => cart.setQuantity(line.variantId, q)}
                onSetUnitPrice={(price) => cart.setUnitPrice(line.variantId, price)}
                allowPriceEdit={
                  !isReturnMode &&
                  !isFulfillBackorderMode &&
                  !hasLoadedQuotation &&
                  !isQuotationLine
                }
                isQuotationLine={isQuotationLine}
                maxQuantity={
                  isFulfillBackorderMode
                    ? cart.loadedBackorder?.lineMaxQtyByVariantId[line.variantId]
                    : isReturnMode
                      ? cart.loadedReturnSale?.lineMaxReturnableQtyByVariantId[
                          line.variantId
                        ]
                      : isQuotationLine && quotationMax != null
                        ? quotationMax
                        : undefined
                }
                maxQuantityContext={
                  isReturnMode
                    ? "return"
                    : isFulfillBackorderMode
                      ? "backorder"
                      : isQuotationLine
                        ? "quotation"
                        : undefined
                }
                readOnly={isFulfillBackorderMode}
                enableDiningTransfer={diningTransferEnabled}
                branchId={ctx.branchId ?? undefined}
              />
            );
            })}
        </div>

        <footer className="shrink-0 border-t border-border pt-3" data-test-id="pos-cart-summary">
          {presaleLinkedEmptyCart ? (
            <Alert variant="warning" className="mb-3" data-test-id="pos-cart-presale-empty-block">
              Desvincula el ticket de preventa o agrega productos para continuar al cobro.
            </Alert>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <div className="grid min-w-0 flex-1 gap-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal neto</span>
                <span className="font-medium text-foreground">{formatMoney(totalsNet)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Impuestos</span>
                <span className="font-medium text-foreground">{formatMoney(taxes)}</span>
              </div>
              {discounts > 0 ? (
                <div
                  className="flex items-center justify-between"
                  data-test-id="pos-cart-summary-discounts"
                >
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <IconButton
                      icon="Info"
                      variant="action"
                      size="xs"
                      ariaLabel="Ver detalle de descuentos"
                      title="Ver detalle de descuentos"
                      onClick={() => setDiscountDetailOpen(true)}
                      data-test-id="pos-cart-summary-discounts-info"
                    />
                    Descuentos
                  </span>
                  <span className="font-medium tabular-nums text-emerald-700 dark:text-emerald-300">
                    -{formatMoney(discounts)}
                  </span>
                </div>
              ) : isOffline ? (
                <p
                  className="text-xs text-muted-foreground"
                  data-test-id="pos-cart-summary-discounts-offline"
                >
                  Descuentos deshabilitados (modo offline)
                </p>
              ) : null}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xl font-bold text-foreground sm:text-2xl">Total</span>
                <span
                  className="text-3xl font-bold tabular-nums text-foreground sm:text-4xl"
                  data-test-id="pos-cart-summary-total"
                >
                  {formatMoney(saleTotal)}
                </span>
              </div>
            </div>
            {isPresaleMode ? (
              <IconButton
                icon="Ticket"
                variant="primary"
                size="lg"
                className="mx-6 shrink-0"
                ariaLabel="Generar ticket"
                title="Generar ticket"
                disabled={checkoutDisabled || presaleBusy}
                isLoading={presaleBusy}
                onClick={() => void handleCheckout()}
                data-test-id="pos-cart-checkout-icon"
              />
            ) : (
              <IconButton
                icon="CircleDollarSign"
                variant="outlined"
                size="lg"
                className="mx-6 shrink-0"
                ariaLabel={checkoutTitle}
                disabled={checkoutDisabled}
                title={
                  presaleLinkedEmptyCart
                    ? "Desvincula el ticket o agrega productos"
                    : checkoutTitle
                }
                onClick={() => void handleCheckout()}
                data-test-id="pos-cart-checkout-icon"
              />
            )}
          </div>
        </footer>
    </aside>
  );

  return (
    <div
      className={
        compactLayout
          ? "flex min-h-0 flex-1 flex-col gap-3"
          : "grid min-h-[calc(100dvh-6rem)] grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-stretch gap-4"
      }
    >
      {compactLayout ? (
        <div
          className="flex shrink-0 rounded-lg border border-border bg-muted/30 p-1"
          role="tablist"
          aria-label="Vista del punto de venta"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mobilePanel === "products"}
            className={`flex min-h-[36px] flex-1 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors ${
              mobilePanel === "products"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
            onClick={() => {
              setMobilePanel("products");
              requestPosProductSearchFocus();
            }}
            data-test-id="pos-mobile-tab-products"
          >
            Productos
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobilePanel === "cart"}
            aria-label={
              cart.itemsCount > 0
                ? `Carrito, ${cart.itemsCount} ítems`
                : "Carrito"
            }
            className={`relative flex min-h-[36px] flex-1 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors ${
              mobilePanel === "cart"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
            onClick={() => setMobilePanel("cart")}
            data-test-id="pos-mobile-tab-cart"
          >
            Carrito
            {cart.itemsCount > 0 ? (
              <span className="absolute right-1 top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold leading-none text-primary">
                {cart.itemsCount > 99 ? "99+" : cart.itemsCount}
              </span>
            ) : null}
          </button>
        </div>
      ) : null}

      {compactLayout && mobilePanel === "products" && cameraEnabled ? (
        <PosBarcodeScanner
          onScan={(code) => productSearchRef.current?.submitScanCode(code)}
          paused={cartLocked}
        />
      ) : null}

      <div className={compactLayout ? "flex min-h-0 flex-1 flex-col" : "contents"}>
        {compactLayout ? (mobilePanel === "products" ? productPanel : cartPanel) : (
          <>
            {productPanel}
            {cartPanel}
          </>
        )}
      </div>

      {quotationsEnabled ? (
      <LoadQuotationDialog
        open={loadQuotationOpen}
        onClose={() => {
          setLoadQuotationOpen(false);
          requestPosProductSearchFocus();
        }}
        pointOfSaleId={ctx?.pointOfSaleId ?? null}
      />
      ) : null}

      <LoadReturnSaleDialog
        open={loadReturnOpen}
        onClose={() => {
          setLoadReturnOpen(false);
          requestPosProductSearchFocus();
        }}
      />
      <LoadBackorderDialog
        open={loadBackorderOpen}
        onClose={() => {
          setLoadBackorderOpen(false);
          requestPosProductSearchFocus();
        }}
        pointOfSaleId={ctx?.pointOfSaleId ?? null}
      />

      <PosDiscountDetailDialog
        open={discountDetailOpen}
        onClose={() => setDiscountDetailOpen(false)}
        appliedPromotions={cart.appliedPromotions}
        lines={cart.lines}
        totalDiscount={discounts}
        promotions={cart.effectivePromotions}
        warnings={cart.promotionWarnings}
      />

      {presaleError ? (
        <div className="fixed bottom-4 left-1/2 z-50 w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2">
          <Alert variant="error">{presaleError}</Alert>
        </div>
      ) : null}

      <Dialog
        open={lastPresaleTicket != null}
        onClose={() => setLastPresaleTicket(null)}
        title="Ticket generado"
        size="sm"
        actions={
          lastPresaleTicket ? (
            <>
              <Button
                type="button"
                variant="outlined"
                onClick={() =>
                  void printPresaleTicketAgentOrBrowser(lastPresaleTicket, {
                    companyName: ctx?.pointOfSaleName,
                  })
                }
              >
                Reimprimir
              </Button>
              <Button type="button" variant="primary" onClick={() => setLastPresaleTicket(null)}>
                Volver al POS
              </Button>
            </>
          ) : null
        }
      >
        {lastPresaleTicket ? (
          <div className="space-y-2 text-center">
            <p className="text-sm text-muted-foreground">Código para caja</p>
            <p className="font-mono text-lg font-bold tracking-wider">{lastPresaleTicket.code}</p>
            <p className="text-sm">{formatMoney(lastPresaleTicket.total)}</p>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
