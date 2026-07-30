"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { usePosCart } from "@/features/pos-cart/PosCartProvider";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import {
  disconnectCustomerDisplay,
  maintainCustomerDisplayConnection,
  syncCustomerDisplayPublisher,
} from "@/features/customer-display/lib/customer-display-publisher";
import { readCustomerDisplayFromStorage } from "@kai/customer-display-client";

function isPaymentPath(pathname: string | null): boolean {
  return Boolean(pathname?.startsWith("/pos/payment"));
}

/**
 * Keeps Kai CFD in sync with the POS cart (best-effort WebSocket).
 * Mount once inside PosCartProvider.
 */
export function CustomerDisplayPublisher() {
  const cart = usePosCart();
  const pathname = usePathname();
  const onPayment = isPaymentPath(pathname);

  useEffect(() => {
    const tick = () => {
      const ctx = readPosContextClient();
      const cfg = readCustomerDisplayFromStorage();
      if (!cfg.enabled) {
        disconnectCustomerDisplay();
        return;
      }
      maintainCustomerDisplayConnection(ctx);
    };
    tick();
    const interval = setInterval(tick, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (onPayment) return;
    const ctx = readPosContextClient();
    syncCustomerDisplayPublisher(
      { lines: cart.lines, orderDiscount: cart.orderDiscount ?? 0 },
      ctx,
    );
  }, [cart.lines, cart.orderDiscount, onPayment]);

  useEffect(() => {
    return () => {
      disconnectCustomerDisplay();
    };
  }, []);

  return null;
}
