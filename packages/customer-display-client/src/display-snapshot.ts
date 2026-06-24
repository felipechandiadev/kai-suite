/** Customer-facing display state (IF-10 / Kai Screen). */
export type CustomerDisplayState = "idle" | "active_sale" | "payment" | "thank_you";

export type CustomerDisplayLine = {
  lineId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type CustomerDisplayCustomer = {
  name: string;
};

export type CustomerDisplayPaymentLine = {
  label: string;
  amount: number;
};

export type CustomerDisplayPaymentSummary = {
  amountDueLabel: string;
  amountToPay: number;
  appliedTotal: number;
  remaining: number;
  overpay: number;
  statusLabel: string;
};

export type CustomerDisplaySnapshot = {
  state: CustomerDisplayState;
  pointOfSaleId: string;
  storeName?: string;
  currency: "CLP";
  lines: CustomerDisplayLine[];
  total: number;
  itemCount: number;
  updatedAt: string;
  customer?: CustomerDisplayCustomer | null;
  payments?: CustomerDisplayPaymentLine[];
  payment?: CustomerDisplayPaymentSummary | null;
};

export type CustomerDisplayEventType = "sale_completed" | "idle";

export type CustomerDisplayEvent = {
  type: CustomerDisplayEventType;
  pointOfSaleId: string;
  total?: number;
  updatedAt: string;
};

export type DisplayStatusPayload = {
  connected: boolean;
  displayAttached: boolean;
  message?: string;
};

const DISPLAY_STATES: CustomerDisplayState[] = ["idle", "active_sale", "payment", "thank_you"];

export function emptyIdleSnapshot(input: {
  pointOfSaleId: string;
  storeName?: string;
}): CustomerDisplaySnapshot {
  return {
    state: "idle",
    pointOfSaleId: input.pointOfSaleId,
    storeName: input.storeName,
    currency: "CLP",
    lines: [],
    total: 0,
    itemCount: 0,
    updatedAt: new Date().toISOString(),
  };
}

function parsePaymentSummary(raw: unknown): CustomerDisplayPaymentSummary | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.amountDueLabel !== "string") return null;
  const nums = ["amountToPay", "appliedTotal", "remaining", "overpay"] as const;
  for (const key of nums) {
    if (typeof p[key] !== "number" || !Number.isFinite(p[key] as number)) return null;
  }
  if (typeof p.statusLabel !== "string") return null;
  return {
    amountDueLabel: p.amountDueLabel,
    amountToPay: p.amountToPay as number,
    appliedTotal: p.appliedTotal as number,
    remaining: p.remaining as number,
    overpay: p.overpay as number,
    statusLabel: p.statusLabel,
  };
}

export function validateCustomerDisplaySnapshot(raw: unknown): CustomerDisplaySnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const state = o.state;
  if (!DISPLAY_STATES.includes(state as CustomerDisplayState)) return null;
  if (typeof o.pointOfSaleId !== "string" || !o.pointOfSaleId.trim()) return null;
  if (o.currency !== "CLP") return null;
  if (!Array.isArray(o.lines)) return null;
  const lines: CustomerDisplayLine[] = [];
  for (const row of o.lines) {
    if (!row || typeof row !== "object") return null;
    const l = row as Record<string, unknown>;
    if (typeof l.lineId !== "string") return null;
    if (typeof l.name !== "string") return null;
    if (typeof l.quantity !== "number" || !Number.isFinite(l.quantity)) return null;
    if (typeof l.unitPrice !== "number" || !Number.isFinite(l.unitPrice)) return null;
    if (typeof l.lineTotal !== "number" || !Number.isFinite(l.lineTotal)) return null;
    lines.push({
      lineId: l.lineId,
      name: l.name,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lineTotal: l.lineTotal,
    });
  }
  if (typeof o.total !== "number" || !Number.isFinite(o.total)) return null;
  if (typeof o.itemCount !== "number" || !Number.isFinite(o.itemCount)) return null;
  if (typeof o.updatedAt !== "string") return null;

  let customer: CustomerDisplayCustomer | null | undefined;
  if (o.customer !== undefined) {
    if (o.customer === null) {
      customer = null;
    } else if (o.customer && typeof o.customer === "object") {
      const c = o.customer as Record<string, unknown>;
      if (typeof c.name !== "string" || !c.name.trim()) return null;
      customer = { name: c.name.trim() };
    } else {
      return null;
    }
  }

  let payments: CustomerDisplayPaymentLine[] | undefined;
  if (o.payments !== undefined) {
    if (!Array.isArray(o.payments)) return null;
    payments = [];
    for (const row of o.payments) {
      if (!row || typeof row !== "object") return null;
      const p = row as Record<string, unknown>;
      if (typeof p.label !== "string") return null;
      if (typeof p.amount !== "number" || !Number.isFinite(p.amount) || p.amount <= 0) continue;
      payments.push({ label: p.label, amount: p.amount });
    }
  }

  const payment = parsePaymentSummary(o.payment);
  if (o.payment !== undefined && payment === null && o.payment !== null) return null;

  return {
    state: state as CustomerDisplayState,
    pointOfSaleId: o.pointOfSaleId.trim(),
    storeName: typeof o.storeName === "string" ? o.storeName : undefined,
    currency: "CLP",
    lines,
    total: o.total,
    itemCount: o.itemCount,
    updatedAt: o.updatedAt,
    customer,
    payments,
    payment: payment ?? undefined,
  };
}
