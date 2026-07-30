import type {
  PurchasingTransactionDetail,
  PurchasingTransactionDetailLine,
  PurchasingTransactionDetailResult,
} from "../types/purchasing-detail.types";
import { apiUrl, authHeaders } from "./api-auth";

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function personName(person: Record<string, unknown> | undefined): string | null {
  if (!person) {
    return null;
  }
  const business =
    typeof person.businessName === "string" ? person.businessName.trim() : "";
  if (business) {
    return business;
  }
  const first = typeof person.firstName === "string" ? person.firstName.trim() : "";
  const last = typeof person.lastName === "string" ? person.lastName.trim() : "";
  const full = [first, last].filter(Boolean).join(" ").trim();
  return full || null;
}

function extractReceptionId(metadata: Record<string, unknown> | null): string | null {
  const links = metadata?.links;
  if (!links || typeof links !== "object") {
    return null;
  }
  const id = (links as Record<string, unknown>).receptionId;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

function normalizeLine(raw: unknown): PurchasingTransactionDetailLine | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  if (!id) {
    return null;
  }
  const productName =
    typeof o.productName === "string" && o.productName.trim()
      ? o.productName.trim()
      : "Ítem";
  const qty = num(o.quantity);
  const unitPrice = num(o.unitPrice);
  const subtotal = num(o.subtotal) || qty * unitPrice;
  const total = num(o.total) || subtotal + num(o.taxAmount);
  const productId =
    o.productId != null && String(o.productId).trim() ? String(o.productId).trim() : null;
  const productVariantId =
    o.productVariantId != null && String(o.productVariantId).trim()
      ? String(o.productVariantId).trim()
      : null;
  const taxId = o.taxId != null && String(o.taxId).trim() ? String(o.taxId).trim() : null;
  return {
    id,
    productId,
    productVariantId,
    productName,
    productSku:
      typeof o.productSku === "string" && o.productSku.trim()
        ? o.productSku.trim()
        : null,
    variantName:
      typeof o.variantName === "string" && o.variantName.trim()
        ? o.variantName.trim()
        : null,
    quantity: qty,
    unitPrice,
    subtotal,
    total,
    taxId,
  };
}

function normalizeDetail(raw: unknown): PurchasingTransactionDetail | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  if (!id) {
    return null;
  }
  const linesRaw = o.lines;
  const lines = (Array.isArray(linesRaw) ? linesRaw : [])
    .map(normalizeLine)
    .filter((x): x is PurchasingTransactionDetailLine => x != null);

  const supplier = o.supplier as Record<string, unknown> | undefined;
  const supplierPerson = supplier?.person as Record<string, unknown> | undefined;
  const supplierId =
    supplier?.id != null && String(supplier.id).trim() ? String(supplier.id).trim() : null;
  const storageId =
    o.storageId != null && String(o.storageId).trim() ? String(o.storageId).trim() : null;
  const meta =
    o.metadata && typeof o.metadata === "object"
      ? (o.metadata as Record<string, unknown>)
      : null;
  const metaDte =
    meta && typeof meta.dteNumber === "string" && meta.dteNumber.trim()
      ? meta.dteNumber.trim()
      : null;

  return {
    id,
    documentNumber: typeof o.documentNumber === "string" ? o.documentNumber : "",
    transactionType:
      typeof o.transactionType === "string" ? o.transactionType : "",
    status: typeof o.status === "string" ? o.status : "",
    createdAt:
      o.createdAt instanceof Date
        ? o.createdAt.toISOString()
        : typeof o.createdAt === "string"
          ? o.createdAt
          : "",
    subtotal: num(o.subtotal),
    taxAmount: num(o.taxAmount),
    total: num(o.total),
    documentFolio:
      typeof o.documentFolio === "string" && o.documentFolio.trim()
        ? o.documentFolio.trim()
        : metaDte,
    externalReference:
      typeof o.externalReference === "string" && o.externalReference.trim()
        ? o.externalReference.trim()
        : null,
    notes: typeof o.notes === "string" && o.notes.trim() ? o.notes.trim() : null,
    supplierId,
    storageId,
    supplierLabel: personName(supplierPerson),
    metadata: meta,
    receptionId: extractReceptionId(meta),
    lines,
  };
}

export class PurchasingDetailPosRequest {
  static async getTransactionById(
    transactionId: string,
  ): Promise<PurchasingTransactionDetailResult> {
    const id = transactionId?.trim();
    if (!id) {
      return { success: false, error: "Transacción inválida" };
    }
    try {
      const headers = await authHeaders();
      const res = await fetch(apiUrl(`transactions/${encodeURIComponent(id)}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          json && typeof json === "object" && "message" in json
            ? String((json as { message: unknown }).message)
            : `HTTP ${res.status}`;
        return { success: false, error: msg };
      }
      const data = normalizeDetail(json);
      if (!data) {
        return { success: false, error: "Respuesta de transacción inválida" };
      }
      return { success: true, data };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "No se pudo cargar el documento",
      };
    }
  }
}
