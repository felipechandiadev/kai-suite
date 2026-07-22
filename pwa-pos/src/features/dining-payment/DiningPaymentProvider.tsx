"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { PosPaymentLine } from "@/features/pos-cart/pos-payment.types";
import {
  clearDiningPaymentDraft,
  readDiningPaymentDraft,
  writeDiningPaymentDraft,
} from "./dining-payment-storage";
import type { DiningPaymentOrderMeta } from "./types";

type DiningPaymentContextValue = {
  ready: boolean;
  order: DiningPaymentOrderMeta | null;
  lines: PosCartLine[];
  payments: PosPaymentLine[];
  orderDiscount: number;
  startDiningPayment: (input: {
    order: DiningPaymentOrderMeta;
    lines: PosCartLine[];
    orderDiscount?: number;
  }) => void;
  setPayments: React.Dispatch<React.SetStateAction<PosPaymentLine[]>>;
  setLines: React.Dispatch<React.SetStateAction<PosCartLine[]>>;
  setOrderDiscount: React.Dispatch<React.SetStateAction<number>>;
  clearDiningPayment: () => void;
};

const DiningPaymentContext = createContext<DiningPaymentContextValue | null>(null);

export function useDiningPayment(): DiningPaymentContextValue {
  const ctx = useContext(DiningPaymentContext);
  if (!ctx) {
    throw new Error("useDiningPayment must be used within DiningPaymentProvider");
  }
  return ctx;
}

export default function DiningPaymentProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [order, setOrder] = useState<DiningPaymentOrderMeta | null>(null);
  const [lines, setLines] = useState<PosCartLine[]>([]);
  const [payments, setPayments] = useState<PosPaymentLine[]>([]);
  const [orderDiscount, setOrderDiscount] = useState(0);

  useEffect(() => {
    const draft = readDiningPaymentDraft();
    if (draft) {
      setOrder(draft.order);
      setLines(draft.lines);
      setPayments(draft.payments);
      setOrderDiscount(draft.orderDiscount);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!order || lines.length === 0) {
      clearDiningPaymentDraft();
      return;
    }
    writeDiningPaymentDraft({
      order,
      lines,
      payments,
      orderDiscount,
    });
  }, [ready, order, lines, payments, orderDiscount]);

  const startDiningPayment = useCallback(
    (input: {
      order: DiningPaymentOrderMeta;
      lines: PosCartLine[];
      orderDiscount?: number;
    }) => {
      setOrder(input.order);
      setLines(input.lines);
      setPayments([]);
      setOrderDiscount(
        typeof input.orderDiscount === "number" && Number.isFinite(input.orderDiscount)
          ? Math.max(0, Math.round(input.orderDiscount))
          : 0,
      );
    },
    [],
  );

  const clearDiningPayment = useCallback(() => {
    setOrder(null);
    setLines([]);
    setPayments([]);
    setOrderDiscount(0);
    clearDiningPaymentDraft();
  }, []);

  const value = useMemo<DiningPaymentContextValue>(
    () => ({
      ready,
      order,
      lines,
      payments,
      orderDiscount,
      startDiningPayment,
      setPayments,
      setLines,
      setOrderDiscount,
      clearDiningPayment,
    }),
    [
      ready,
      order,
      lines,
      payments,
      orderDiscount,
      startDiningPayment,
      clearDiningPayment,
    ],
  );

  return (
    <DiningPaymentContext.Provider value={value}>{children}</DiningPaymentContext.Provider>
  );
}
