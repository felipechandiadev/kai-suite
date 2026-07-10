"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button, IconButton } from "@kai/ui";
import { useEShopCart } from "@/features/e-shop-cart/EShopCartProvider";
import { getFeaturedProductsAction } from "@/features/e-shop-storefront/actions/storefront.action";
import { EShopFreeShippingProgress } from "./EShopFreeShippingProgress";
import "./eshop-cart-drawer.css";

function fmt(n: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
}

export function EShopCartDrawer() {
  const { lines, subtotal, drawerOpen, closeDrawer, removeItem, crossSell, addItem, setCrossSell } =
    useEShopCart();
  const crossSellLoadedRef = useRef(false);

  useEffect(() => {
    if (!drawerOpen || crossSellLoadedRef.current) {
      return;
    }
    crossSellLoadedRef.current = true;
    getFeaturedProductsAction().then((r) => setCrossSell(r.items ?? []));
  }, [drawerOpen, setCrossSell]);

  const suggestions = crossSell.filter(
    (p) =>
      p.defaultVariantId &&
      !lines.some((l) => l.productVariantId === p.defaultVariantId) &&
      p.inStock !== false,
  ).slice(0, 3);

  return (
    <div
      className={`eshop-cart-shell ${drawerOpen ? "open" : ""}`}
      aria-hidden={!drawerOpen}
    >
      <div className="eshop-cart-overlay" onClick={closeDrawer} role="presentation" />
      <aside className="eshop-cart-drawer">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-semibold">Tu carrito</h2>
          <IconButton icon="X" variant="neutral" ariaLabel="Cerrar carrito" onClick={closeDrawer} />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <EShopFreeShippingProgress />
          {lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">El carrito está vacío.</p>
          ) : (
            lines.map((l) => (
              <div key={l.productVariantId} className="flex gap-3 border-b border-border pb-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{l.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.quantity} × {fmt(l.unitPrice)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <IconButton
                    icon="Trash2"
                    variant="text"
                    size="sm"
                    ariaLabel="Quitar del carrito"
                    onClick={() => removeItem(l.productVariantId)}
                  />
                  <p className="text-sm font-semibold tabular-nums">{fmt(l.unitPrice * l.quantity)}</p>
                </div>
              </div>
            ))
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
                onClick={() => {
                  if (!p.defaultVariantId) {
                    return;
                  }
                  addItem({
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
          <Link href="/checkout" onClick={closeDrawer}>
            <Button variant="primary" className="w-full">
              Procesar pago
            </Button>
          </Link>
        </div>
      </aside>
    </div>
  );
}
