"use client";

import { useEffect, useRef } from "react";
import {
  clearCheckoutDraft,
  loadCheckoutDraft,
  saveCheckoutDraft,
  type CheckoutDraft,
} from "../lib/checkout-storage";
import type { CheckoutStepId } from "../lib/checkout-steps";

type DraftInput = Omit<CheckoutDraft, "version" | "savedAt" | "cartId" | "cartToken">;

export function useCheckoutDraft(
  cartId: string | null,
  cartToken: string | null,
  current: DraftInput,
  enabled = true,
) {
  const restoredRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !cartId || restoredRef.current) return;
    restoredRef.current = true;
    const draft = loadCheckoutDraft(cartId);
    if (!draft) return;
    // restoration handled by wizard via onRestore callback pattern — draft read only here
    void draft;
  }, [cartId, enabled]);

  useEffect(() => {
    if (!enabled || !cartId || !cartToken) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      saveCheckoutDraft({
        ...current,
        cartId,
        cartToken,
        version: 1,
        savedAt: Date.now(),
      });
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, cartId, cartToken, current]);

  return {
    clear: () => clearCheckoutDraft(cartId),
    restore: (): CheckoutDraft | null => loadCheckoutDraft(cartId),
  };
}

export type { CheckoutStepId };
