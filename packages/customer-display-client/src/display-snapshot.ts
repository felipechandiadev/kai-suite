/** Customer-facing display state (IF-10 / Kai Screen). */
export type CustomerDisplayState = "idle" | "active_sale" | "thank_you";

export type CustomerDisplayLine = {
  lineId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
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

export function validateCustomerDisplaySnapshot(raw: unknown): CustomerDisplaySnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const state = o.state;
  if (state !== "idle" && state !== "active_sale" && state !== "thank_you") return null;
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
  return {
    state,
    pointOfSaleId: o.pointOfSaleId.trim(),
    storeName: typeof o.storeName === "string" ? o.storeName : undefined,
    currency: "CLP",
    lines,
    total: o.total,
    itemCount: o.itemCount,
    updatedAt: o.updatedAt,
  };
}
