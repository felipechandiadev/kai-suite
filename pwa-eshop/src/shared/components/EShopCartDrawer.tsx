"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Alert, Button, IconButton } from "@kai/ui";
import { useEShopCart } from "@/features/e-shop-cart/EShopCartProvider";
import { getFeaturedProductsAction } from "@/features/e-shop-storefront/actions/storefront.action";
import { EShopFreeShippingProgress } from "./EShopFreeShippingProgress";
import "./eshop-cart-drawer.css";

function fmt(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

function issueLabel(code: string): string {
  switch (code) {
    case "PRICE_CHANGED":
      return "Precio actualizado";
    case "OUT_OF_STOCK":
      return "Sin stock";
    case "INSUFFICIENT_STOCK":
      return "Stock insuficiente";
    case "VARIANT_UNAVAILABLE":
      return "No disponible";
    case "QTY_ADJUSTED":
      return "Cantidad ajustada";
    default:
      return "Aviso";
  }
}

export function EShopCartDrawer() {
  const {
    lines,
    subtotal,
    drawerOpen,
    closeDrawer,
    removeItem,
    setQuantity,
    crossSell,
    addItem,
    setCrossSell,
    cartLoading,
    cartUpdating,
    cartLocked,
    issues,
    revalidateCart,
  } = useEShopCart();
  const crossSellLoadedRef = useRef(false);

  useEffect(() => {
    if (!drawerOpen || crossSellLoadedRef.current) return;
    crossSellLoadedRef.current = true;
    getFeaturedProductsAction().then((r) => setCrossSell(r.items ?? []));
  }, [drawerOpen, setCrossSell]);

  useEffect(() => {
    if (!drawerOpen || cartLocked) return;
    void revalidateCart();
  }, [drawerOpen, cartLocked, revalidateCart]);

  const suggestions = crossSell
    .filter(
      (p) =>
        p.defaultVariantId &&
        !lines.some((l) => l.productVariantId === p.defaultVariantId) &&
        p.inStock !== false,
    )
    .slice(0, 3);

  const blockingIssues = issues.filter((i) => i.code === "VARIANT_UNAVAILABLE");
  const canCheckout = lines.length > 0 && blockingIssues.length === 0 && !cartLocked;

  return (
    <div className={`eshop-cart-shell ${drawerOpen ? "open" : ""}`} aria-hidden={!drawerOpen}>
      <div className="eshop-cart-overlay" onClick={closeDrawer} role="presentation" />
      <aside className="eshop-cart-drawer">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-semibold">Tu carrito</h2>
          <IconButton icon="X" variant="neutral" ariaLabel="Cerrar carrito" onClick={closeDrawer} />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cartLocked ? (
            <Alert variant="info">
              El carrito está bloqueado mientras completas el checkout.
            </Alert>
          ) : null}

          {issues.length > 0 ? (
            <div className="space-y-2">
              {issues.map((issue) => (
                <Alert key={`${issue.code}-${issue.productVariantId}`} variant="warning">
                  <span className="font-medium">{issueLabel(issue.code)}:</span> {issue.message}
                </Alert>
              ))}
            </div>
          ) : null}

          <EShopFreeShippingProgress />

          {cartLoading ? (
            <p className="text-sm text-muted-foreground">Cargando carrito…</p>
          ) : lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">El carrito está vacío.</p>
          ) : (
            lines.map((l) => {
              const lineIssues = issues.filter((i) => i.productVariantId === l.productVariantId);
              return (
                <div key={l.productVariantId} className="flex gap-3 border-b border-border pb-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{l.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmt(l.unitPrice)} c/u
                    </p>
                    {lineIssues.length > 0 ? (
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                        {lineIssues.map((i) => i.message).join(" · ")}
                      </p>
                    ) : null}
                    <div className="mt-2 flex items-center gap-2">
                      <IconButton
                        icon="Minus"
                        variant="neutral"
                        size="sm"
                        ariaLabel="Disminuir cantidad"
                        disabled={cartUpdating || cartLocked || l.quantity <= 1}
                        onClick={() => void setQuantity(l.productVariantId, l.quantity - 1)}
                      />
                      <span className="min-w-[2ch] text-center text-sm tabular-nums">{l.quantity}</span>
                      <IconButton
                        icon="Plus"
                        variant="neutral"
                        size="sm"
                        ariaLabel="Aumentar cantidad"
                        disabled={cartUpdating || cartLocked}
                        onClick={() => void setQuantity(l.productVariantId, l.quantity + 1)}
                      />
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <IconButton
                      icon="Trash2"
                      variant="text"
                      size="sm"
                      ariaLabel="Quitar del carrito"
                      disabled={cartUpdating || cartLocked}
                      onClick={() => void removeItem(l.productVariantId)}
                    />
                    <p className="text-sm font-semibold tabular-nums">
                      {fmt(l.unitPrice * l.quantity)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {suggestions.length > 0 ? (
          <div className="border-t border-border p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              También te puede interesar
            </p>
            {suggestions.map((p) => (
              <button
                key={p.id}
                type="button"
                className="flex w-full items-center justify-between gap-2 text-left text-sm"
                disabled={cartUpdating || cartLocked}
                onClick={() => {
                  if (!p.defaultVariantId) return;
                  void addItem({
                    productVariantId: p.defaultVariantId,
                    unitPrice: p.basePrice,
                    name: p.name,
                    imageUrl: p.imageUrl,
                  });
                }}
              >
                <span className="line-clamp-1">{p.name}</span>
                <span className="shrink-0 text-primary">+ Agregar</span>
              </button>
            ))}
          </div>
        ) : null}

        <div className="border-t border-border p-4 space-y-3">
          <div className="flex justify-between text-sm font-semibold">
            <span>Subtotal</span>
            <span>{fmt(subtotal)}</span>
          </div>
          {canCheckout ? (
            <Link href="/checkout" onClick={closeDrawer}>
              <Button variant="primary" className="w-full" disabled={cartUpdating}>
                Procesar pago
              </Button>
            </Link>
          ) : (
            <Button variant="primary" className="w-full" disabled>
              {lines.length === 0 ? "Carrito vacío" : "Revisa el carrito"}
            </Button>
          )}
        </div>
      </aside>
    </div>
  );
}
