import { create } from "zustand";

export type PosPhase = "opening" | "sale" | "payment" | "closing";

/** pending = aún resolviendo si hay caja abierta; ready = ya se puede mostrar apertura o venta. */
export type SessionBootstrap = "pending" | "ready";

export type CartLine = {
  variantId: string;
  name: string;
  qty: number;
  unitPrice: number;
  productType: "PHYSICAL" | "SERVICE" | "PACK";
};

export type PaymentLine = {
  id: string;
  method: string;
  amount: number;
  reference?: string;
};

type PosCartState = {
  phase: PosPhase;
  setPhase: (p: PosPhase) => void;
  sessionBootstrap: SessionBootstrap;
  setSessionBootstrap: (s: SessionBootstrap) => void;
  lines: CartLine[];
  addLine: (line: Omit<CartLine, "qty"> & { qty?: number }) => void;
  setQty: (variantId: string, qty: number) => void;
  clear: () => void;
  payments: PaymentLine[];
  setPayments: (payments: PaymentLine[]) => void;
  addPayment: (line: Omit<PaymentLine, "id"> & { id?: string }) => void;
  updatePayment: (id: string, patch: Partial<Omit<PaymentLine, "id">>) => void;
  removePayment: (id: string) => void;
  clearPayments: () => void;
  customerId: string | null;
  setCustomerId: (id: string | null) => void;
  openingFloat: number;
  setOpeningFloat: (n: number) => void;
  sessionOpen: boolean;
  setSessionOpen: (v: boolean) => void;
  cashSessionId: string | null;
  setCashSessionId: (id: string | null) => void;
  pointOfSaleId: string | null;
  setPointOfSaleId: (id: string | null) => void;
  lastPrintWarning: string | null;
  setLastPrintWarning: (msg: string | null) => void;
  resetSession: () => void;
};

function newPaymentId(): string {
  return `pay-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const usePosCartStore = create<PosCartState>((set, get) => ({
  phase: "opening",
  setPhase: (phase) => set({ phase }),
  sessionBootstrap: "pending",
  setSessionBootstrap: (sessionBootstrap) => set({ sessionBootstrap }),
  lines: [],
  addLine: (line) => {
    const qty = line.qty ?? 1;
    const existing = get().lines.find((l) => l.variantId === line.variantId);
    if (existing) {
      set({
        lines: get().lines.map((l) =>
          l.variantId === line.variantId ? { ...l, qty: l.qty + qty } : l,
        ),
      });
      return;
    }
    set({ lines: [...get().lines, { ...line, qty }] });
  },
  setQty: (variantId, qty) => {
    if (qty <= 0) {
      set({ lines: get().lines.filter((l) => l.variantId !== variantId) });
      return;
    }
    set({
      lines: get().lines.map((l) => (l.variantId === variantId ? { ...l, qty } : l)),
    });
  },
  clear: () => set({ lines: [], customerId: null, payments: [] }),
  payments: [],
  setPayments: (payments) => set({ payments }),
  addPayment: (line) => {
    set({
      payments: [
        ...get().payments,
        {
          id: line.id ?? newPaymentId(),
          method: line.method,
          amount: line.amount,
          ...(line.reference != null ? { reference: line.reference } : {}),
        },
      ],
    });
  },
  updatePayment: (id, patch) => {
    set({
      payments: get().payments.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
  },
  removePayment: (id) => {
    set({ payments: get().payments.filter((p) => p.id !== id) });
  },
  clearPayments: () => set({ payments: [] }),
  customerId: null,
  setCustomerId: (customerId) => set({ customerId }),
  openingFloat: 0,
  setOpeningFloat: (openingFloat) => set({ openingFloat }),
  sessionOpen: false,
  setSessionOpen: (sessionOpen) => set({ sessionOpen }),
  cashSessionId: null,
  setCashSessionId: (cashSessionId) => set({ cashSessionId }),
  pointOfSaleId: null,
  setPointOfSaleId: (pointOfSaleId) => set({ pointOfSaleId }),
  lastPrintWarning: null,
  setLastPrintWarning: (lastPrintWarning) => set({ lastPrintWarning }),
  resetSession: () =>
    set({
      sessionOpen: false,
      cashSessionId: null,
      pointOfSaleId: null,
      lines: [],
      payments: [],
      customerId: null,
      phase: "opening",
      sessionBootstrap: "ready",
      lastPrintWarning: null,
    }),
}));

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((acc, l) => acc + l.qty * l.unitPrice, 0);
}

export function paymentsSum(payments: PaymentLine[]): number {
  return payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
}

export function paymentRemaining(total: number, payments: PaymentLine[]): number {
  return Math.max(0, total - paymentsSum(payments));
}

export function paymentOverpay(total: number, payments: PaymentLine[]): number {
  return Math.max(0, paymentsSum(payments) - total);
}

export function paymentStatusLabel(total: number, payments: PaymentLine[]): string {
  if (total <= 0) return "Sin total";
  if (payments.length === 0) return "Sin pagos";
  if (paymentOverpay(total, payments) > 0) return "Pago con vuelto";
  if (paymentRemaining(total, payments) <= 0.01) return "Pago completo";
  return "Monto insuficiente";
}

export function paymentComplete(total: number, payments: PaymentLine[]): boolean {
  return payments.length > 0 && paymentRemaining(total, payments) <= 0.01;
}
