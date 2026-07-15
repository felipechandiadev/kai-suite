"use client";

import { useEffect, useRef } from "react";
import { useEShopCart } from "@/features/e-shop-cart/EShopCartProvider";

/** Tras pedido exitoso: descartar token del carrito convertido y abrir uno vacío. */
export function ClearCartOnOrderSuccess({
  documentNumber,
  orderId,
}: {
  documentNumber?: string;
  orderId?: string;
}) {
  const { startFreshCartAfterOrder } = useEShopCart();
  const cleared = useRef(false);

  useEffect(() => {
    const hasOrder = Boolean(documentNumber?.trim() || orderId?.trim());
    if (!hasOrder || cleared.current) return;
    cleared.current = true;
    void startFreshCartAfterOrder();
  }, [documentNumber, orderId, startFreshCartAfterOrder]);

  return null;
}
