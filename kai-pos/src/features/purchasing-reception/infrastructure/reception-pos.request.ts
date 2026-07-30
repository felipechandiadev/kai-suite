import { apiUrl, authHeaders } from "./api-auth";
import type {
  CreateDirectReceptionInput,
  ReceptionDetailForReturn,
} from "../types/reception.types";

function normalizeReceptionDetail(raw: unknown): ReceptionDetailForReturn {
  if (!raw || typeof raw !== "object") {
    throw new Error("Respuesta de recepción inválida");
  }
  const o = raw as Record<string, unknown>;
  const id = o.id;
  if (typeof id !== "string" || !id.trim()) {
    throw new Error("Recepción sin id");
  }
  const linesRaw = o.lines;
  const lines: ReceptionDetailForReturn["lines"] = [];
  if (Array.isArray(linesRaw)) {
    for (const row of linesRaw) {
      if (!row || typeof row !== "object") continue;
      const lr = row as Record<string, unknown>;
      const lid = lr.id;
      if (typeof lid !== "string" || !lid.trim()) continue;
      lines.push({
        id: lid.trim(),
        productId: typeof lr.productId === "string" ? lr.productId : null,
        productVariantId: typeof lr.productVariantId === "string" ? lr.productVariantId : null,
        productName:
          typeof lr.productName === "string" && lr.productName.trim()
            ? lr.productName.trim()
            : "Ítem",
        sku: typeof lr.sku === "string" ? lr.sku : null,
        variantName: typeof lr.variantName === "string" ? lr.variantName : null,
        quantity: Number(lr.quantity) || 0,
        receivedQuantity: lr.receivedQuantity != null ? Number(lr.receivedQuantity) : null,
        unitPrice: Math.max(0, Number(lr.unitPrice) || 0),
      });
    }
  }
  return {
    id: id.trim(),
    supplierId: typeof o.supplierId === "string" ? o.supplierId : null,
    storageId: typeof o.storageId === "string" ? o.storageId : null,
    documentNumber:
      typeof o.documentNumber === "string" && o.documentNumber.trim()
        ? o.documentNumber.trim()
        : null,
    folio:
      typeof o.folio === "string" && o.folio.trim()
        ? o.folio.trim()
        : typeof o.documentNumber === "string" && o.documentNumber.trim()
          ? o.documentNumber.trim()
          : null,
    reference: typeof o.reference === "string" && o.reference.trim() ? o.reference.trim() : null,
    lines,
  };
}

export class ReceptionPosRequest {
  static async createDirect(
    input: CreateDirectReceptionInput & {
      userId: string;
      cashSessionId?: string | null;
      pointOfSaleId?: string | null;
    },
  ): Promise<unknown> {
    const { userId, cashSessionId, pointOfSaleId, ...body } = input;
    const headers = await authHeaders();
    const res = await fetch(apiUrl("receptions/direct"), {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...body,
        userId,
        cashSessionId: cashSessionId?.trim() || undefined,
        pointOfSaleId: pointOfSaleId?.trim() || undefined,
        storageId: body.storageId?.trim() || undefined,
        supplierId: body.supplierId?.trim() || undefined,
        purchaseOrderId: body.purchaseOrderId?.trim() || undefined,
        reference: body.reference?.trim() || undefined,
        documentType: body.documentType,
        notes: body.notes?.trim() || undefined,
        supplierDocumentPayment: body.supplierDocumentPayment ?? undefined,
        supplierFiscalAmounts: body.supplierFiscalAmounts ?? undefined,
        lines: body.lines.map((l) => {
          const unit = Number(l.unitCost ?? l.unitPrice ?? 0) || 0;
          const qty = Number(l.quantity) || 0;
          return {
            productId: l.productId,
            productVariantId: l.productVariantId,
            productName: l.productName,
            sku: l.sku,
            quantity: qty,
            receivedQuantity: l.receivedQuantity ?? qty,
            unitPrice: unit,
            unitCost: unit,
          };
        }),
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      const msg =
        typeof data.message === "string"
          ? data.message
          : Array.isArray(data.message)
            ? (data.message as string[]).join("; ")
            : typeof data.error === "string"
              ? data.error
              : `HTTP ${res.status}`;
      throw new Error(String(msg));
    }
    return res.json();
  }
}

export { normalizeReceptionDetail };
