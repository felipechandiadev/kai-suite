"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchPointOfSalePriceListsAction } from "@/features/session/actions/point-of-sale-pos.action";
import {
  patchPosContextClient,
  readPosContextClient,
  type PosContextV1,
  type PosPriceListSnapshot,
} from "@/features/session/lib/pos-context-storage";
import { Button, IconButton } from "@/shared/admin-shared";
import { ArrowUpFromLine, Package, RotateCcw, ShoppingCart } from "lucide-react";
import PosProductSearchPanel, { POS_PRODUCT_SEARCH_PANEL_HEIGHT_VH } from "./PosProductSearchPanel";
import PosCartLineCard from "./PosCartLineCard";
import { isQuotationCartVariant, usePosCart } from "@/features/pos-cart/PosCartProvider";
import { LoadQuotationDialog } from "./LoadQuotationDialog";
import { LoadReturnSaleDialog } from "./LoadReturnSaleDialog";
import { LoadBackorderDialog } from "./LoadBackorderDialog";
import { runPendingCashSessionOpeningPrintIfAny } from "@/features/cash-session-opening/lib/run-pending-cash-session-opening-print";
import { requestPosProductSearchFocus } from "@/features/pos-products/lib/pos-product-search-focus";
import { usePosCompactLayout } from "@/shared/hooks/usePosCompactLayout";

type MobilePanel = "products" | "cart";
function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(
    Math.round(n),
  );
}

export default function PosWorkspace() {
  const router = useRouter();
  const compactLayout = usePosCompactLayout();
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("products");
  const [ctx, setCtx] = useState<PosContextV1 | null>(null);
  const [priceListId, setPriceListId] = useState("");
  const [priceListOptions, setPriceListOptions] = useState<PosPriceListSnapshot[]>([]);
  const cart = usePosCart();
  const [loadQuotationOpen, setLoadQuotationOpen] = useState(false);
  const [loadReturnOpen, setLoadReturnOpen] = useState(false);
  const [loadBackorderOpen, setLoadBackorderOpen] = useState(false);
  const isReturnMode = cart.isReturnMode;
  const isFulfillBackorderMode = cart.isFulfillBackorderMode;
  const hasLoadedQuotation = cart.loadedQuotation != null;
  const quotationsEnabled = cart.quotationsEnabled;
  const cartLocked = isReturnMode || isFulfillBackorderMode;

  const refreshPriceListOptions = useCallback(async (posId: string, currentListId?: string) => {
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
  }, []);

  useEffect(() => {
    const c = readPosContextClient();
    if (!c?.pointOfSaleId || !c?.priceListId) {
      router.replace("/session-setup");
      return;
    }

    void (async () => {
      const res = await fetchPointOfSalePriceListsAction(c.pointOfSaleId);
      if (res.success) {
        patchPosContextClient({
          ...(res.branchId ? { branchId: res.branchId, branchName: res.branchName ?? null } : {}),
          storageId: res.storageId ?? null,
          pointOfSaleName: res.pointOfSaleName ?? c.pointOfSaleName ?? null,
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
      if (res.success && res.priceLists.length > 0) {
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

  const branchId = ctx?.branchId?.trim() ? ctx.branchId.trim() : null;

  const addProduct = useCallback(
    (item: any) => {
      cart.addItem(item);
      if (compactLayout) {
        setMobilePanel("cart");
      }
    },
    [cart, compactLayout],
  );

  const totals = useMemo(
    () =>
      cart.lines.reduce(
        (acc, l) => {
          const q = Number(l.quantity) || 0;
          const net = (Number(l.unitPrice) || 0) * q;
          const gross = (Number(l.unitPriceWithTax) || 0) * q;
          acc.net += net;
          acc.gross += gross;
          return acc;
        },
        { net: 0, gross: 0 },
      ),
    [cart.lines],
  );
  const taxes = Math.max(0, totals.gross - totals.net);
  const lineDiscountsTotal = useMemo(
    () => cart.lines.reduce((acc, l) => acc + (l.discount?.discountAmount ?? 0), 0),
    [cart.lines],
  );
  const saleTotal = Math.max(0, totals.gross - lineDiscountsTotal - (cart.orderDiscount ?? 0));

  const checkoutDisabled = cart.lines.length === 0;

  const checkoutTitle = useMemo(() => {
    if (isReturnMode) return "Ir a devolución";
    if (isFulfillBackorderMode) return "Liquidar encargo";
    return "Ir a cobro";
  }, [isReturnMode, isFulfillBackorderMode]);

  if (!ctx?.priceListId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
        Cargando contexto del punto de venta…
      </div>
    );
  }

  const productPanel = (
    <PosProductSearchPanel
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
          : "En devolución solo puedes quitar líneas del carrito. Usa «Desvincular» para salir."
      }
      compactLayout={compactLayout}
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
        <div className="flex shrink-0 items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {quotationsEnabled ? (
            <Button
              variant="outlined"
              size="sm"
              onClick={() => setLoadQuotationOpen(true)}
              disabled={cartLocked}
              data-test-id="pos-load-quotation-btn"
              className="shrink-0"
            >
              <ArrowUpFromLine size={14} className="shrink-0" aria-hidden />
              <span>Cotización</span>
            </Button>
            ) : null}
            <Button
              variant="outlined"
              size="sm"
              onClick={() => setLoadReturnOpen(true)}
              disabled={(isReturnMode || isFulfillBackorderMode) && cart.lines.length > 0}
              title={
                isFulfillBackorderMode && cart.lines.length > 0
                  ? "Desvincule el encargo actual para cargar una devolución"
                  : isReturnMode && cart.lines.length > 0
                    ? "Desvincule la devolución actual para cargar otra venta"
                    : "Cargar venta origen para devolución"
              }
              data-test-id="pos-load-return-btn"
              className="shrink-0"
            >
              <RotateCcw size={14} className="shrink-0" aria-hidden />
              <span>Devolución</span>
            </Button>
            <Button
              variant="outlined"
              size="sm"
              onClick={() => setLoadBackorderOpen(true)}
              disabled={isFulfillBackorderMode && cart.lines.length > 0}
              title={
                isFulfillBackorderMode && cart.lines.length > 0
                  ? "Desvincule el encargo actual para cargar otro"
                  : "Cargar encargo abierto para liquidar"
              }
              data-test-id="pos-load-backorder-btn"
              className="shrink-0"
            >
              <Package size={14} className="shrink-0" aria-hidden />
              <span>Encargo</span>
            </Button>
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
              />
            );
            })}
        </div>

        <footer className="shrink-0 border-t border-border pt-3" data-test-id="pos-cart-summary">
          <div className="flex items-center justify-between gap-3">
            <div className="grid min-w-0 flex-1 gap-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal neto</span>
                <span className="font-medium text-foreground">{formatMoney(totals.net)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Impuestos</span>
                <span className="font-medium text-foreground">{formatMoney(taxes)}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-semibold text-foreground">Total</span>
                <span className="text-sm font-semibold text-foreground">{formatMoney(totals.gross)}</span>
              </div>
            </div>
            <IconButton
              icon="CircleDollarSign"
              variant="outlined"
              size="lg"
              className="mx-6 shrink-0"
              ariaLabel={checkoutTitle}
              disabled={checkoutDisabled}
              title={checkoutTitle}
              onClick={() => router.push("/pos/payment")}
              data-test-id="pos-cart-checkout-icon"
            />
          </div>
        </footer>
    </aside>
  );

  return (
    <div
      className={
        compactLayout
          ? "flex min-h-0 flex-1 flex-col gap-3"
          : "grid min-h-[calc(100dvh-6rem)] grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-stretch gap-6"
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
            className={`min-h-[44px] flex-1 rounded-md px-3 text-sm font-medium transition-colors ${
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
            className={`relative min-h-[44px] flex-1 rounded-md px-3 text-sm font-medium transition-colors ${
              mobilePanel === "cart"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
            onClick={() => setMobilePanel("cart")}
            data-test-id="pos-mobile-tab-cart"
          >
            Carrito
            {cart.itemsCount > 0 ? (
              <span className="ml-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 text-[10px] font-bold text-primary">
                {cart.itemsCount > 99 ? "99+" : cart.itemsCount}
              </span>
            ) : null}
          </button>
        </div>
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
    </div>
  );
}
