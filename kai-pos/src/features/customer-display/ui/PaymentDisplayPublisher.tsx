"use client";

import { useEffect } from "react";
import type { CustomerDisplayPaymentLineInput } from "@/features/customer-display/lib/build-customer-display-payment-snapshot";
import { buildCustomerDisplayPaymentSnapshot } from "@/features/customer-display/lib/build-customer-display-payment-snapshot";
import {
  setCustomerDisplayPaymentMode,
  syncCustomerDisplayPayment,
} from "@/features/customer-display/lib/customer-display-publisher";
import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";

type Props = {
  enabled: boolean;
  lines: PosCartLine[];
  orderDiscount: number;
  amountDueLabel: string;
  amountToPay: number;
  appliedTotal: number;
  remaining: number;
  overpay: number;
  paymentStatusLabel: string;
  customerName?: string | null;
  paymentLines: CustomerDisplayPaymentLineInput[];
};

/**
 * Publishes payment-state snapshots to Kai CFD while the POS is on /pos/payment.
 */
export function PaymentDisplayPublisher({
  enabled,
  lines,
  orderDiscount,
  amountDueLabel,
  amountToPay,
  appliedTotal,
  remaining,
  overpay,
  paymentStatusLabel,
  customerName,
  paymentLines,
}: Props) {
  useEffect(() => {
    setCustomerDisplayPaymentMode(enabled);
    return () => {
      setCustomerDisplayPaymentMode(false);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const ctx = readPosContextClient();
    const snapshot = buildCustomerDisplayPaymentSnapshot({
      lines,
      orderDiscount,
      ctx,
      amountDueLabel,
      amountToPay,
      appliedTotal,
      remaining,
      overpay,
      paymentStatusLabel,
      customerName,
      paymentLines,
    });
    syncCustomerDisplayPayment(snapshot, ctx);
  }, [
    enabled,
    lines,
    orderDiscount,
    amountDueLabel,
    amountToPay,
    appliedTotal,
    remaining,
    overpay,
    paymentStatusLabel,
    customerName,
    paymentLines,
  ]);

  return null;
}
