"use client";

import { useEShopCart } from "@/features/e-shop-cart/EShopCartProvider";

function fmt(n: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
}

export function EShopFreeShippingProgress() {
  const { subtotal, freeShippingThreshold } = useEShopCart();
  if (freeShippingThreshold == null || freeShippingThreshold <= 0) return null;

  const gap = Math.max(0, freeShippingThreshold - subtotal);
  const pct = Math.min(100, (subtotal / freeShippingThreshold) * 100);

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-secondary transition-[width]" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">
        {gap <= 0 ? "¡Envío gratis desbloqueado!" : `Te faltan ${fmt(gap)} para envío gratis`}
      </p>
    </div>
  );
}
