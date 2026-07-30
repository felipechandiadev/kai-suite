import type { DiningOrderKind } from "@/features/dining/types/dining-pos.types";
import type { PosPaymentLine } from "@/features/pos-cart/pos-payment.types";
import type { DiningPaymentDraft, DiningPaymentOrderMeta } from "./types";

const STORAGE_KEY = "kai.pos.diningPayment.v1";

function isDiningKind(v: unknown): v is DiningOrderKind {
  return v === "TABLE" || v === "COUNTER" || v === "TAKEAWAY";
}

function parseOrder(raw: unknown): DiningPaymentOrderMeta | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id).trim() : "";
  const displayLabel = o.displayLabel != null ? String(o.displayLabel).trim() : "";
  if (!id || !isDiningKind(o.kind)) return null;
  return {
    id,
    displayLabel: displayLabel || id,
    kind: o.kind,
  };
}

function parsePayments(raw: unknown): PosPaymentLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((p) => p && typeof p === "object") as PosPaymentLine[];
}

export function writeDiningPaymentDraft(draft: DiningPaymentDraft): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // ignore quota / private mode
  }
}

export function readDiningPaymentDraft(): DiningPaymentDraft | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const order = parseOrder(parsed.order);
    if (!order) return null;
    const lines = Array.isArray(parsed.lines) ? (parsed.lines as DiningPaymentDraft["lines"]) : [];
    if (lines.length === 0) return null;
    const orderDiscount = Number(parsed.orderDiscount);
    return {
      order,
      lines,
      payments: parsePayments(parsed.payments),
      orderDiscount: Number.isFinite(orderDiscount) && orderDiscount >= 0 ? orderDiscount : 0,
    };
  } catch {
    return null;
  }
}

export function clearDiningPaymentDraft(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
