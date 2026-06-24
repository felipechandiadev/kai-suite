"use client";

import { useEffect } from "react";
import { usePosCart } from "@/features/pos-cart/PosCartProvider";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import {
  disconnectCustomerDisplay,
  syncCustomerDisplayPublisher,
} from "@/features/customer-display/lib/customer-display-publisher";

/**
 * Keeps Kai Screen in sync with the POS cart (best-effort WebSocket).
 * Mount once inside PosCartProvider.
 */
export function CustomerDisplayPublisher() {
  const cart = usePosCart();

  useEffect(() => {
    const ctx = readPosContextClient();
    syncCustomerDisplayPublisher(
      { lines: cart.lines, orderDiscount: cart.orderDiscount ?? 0 },
      ctx,
    );
  }, [cart.lines, cart.orderDiscount]);

  useEffect(() => {
    return () => {
      disconnectCustomerDisplay();
    };
  }, []);

  return null;
}
