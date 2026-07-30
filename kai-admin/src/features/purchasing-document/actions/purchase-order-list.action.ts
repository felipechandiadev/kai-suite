"use server";

import { TransactionsSearchRequest } from "../infrastructure/transactions-search.request";
import type { PurchaseOrderGridRow } from "../types/purchase-order-list.types";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function supplierNameFromRow(tx: Record<string, unknown>): string {
  const s = asRecord(tx.supplier);
  if (!s) {
    return "—";
  }
  const alias = s.alias != null ? String(s.alias).trim() : "";
  if (alias) {
    return alias;
  }
  const p = asRecord(s.person) ?? asRecord(s.supplierPerson);
  if (!p) {
    return "—";
  }
  const business = p.businessName != null ? String(p.businessName).trim() : "";
  if (business) {
    return business;
  }
  const full = [p.firstName, p.lastName].filter(Boolean).map(String).join(" ").trim();
  return full || "—";
}

function supplierDocumentNumberFromRow(tx: Record<string, unknown>): string | null {
  const s = asRecord(tx.supplier);
  const p = (s ? asRecord(s.person) ?? asRecord(s.supplierPerson) : null) ?? null;
  if (!p) {
    return null;
  }
  const raw = p.documentNumber != null ? String(p.documentNumber).trim() : "";
  return raw || null;
}

function branchNameFromRow(tx: Record<string, unknown>): string {
  const b = asRecord(tx.branch);
  if (!b) {
    return "—";
  }
  const name = b.name != null ? String(b.name).trim() : "";
  return name || "—";
}

function normalizePurchaseOrderRow(raw: unknown): PurchaseOrderGridRow | null {
  const tx = asRecord(raw);
  if (!tx) {
    return null;
  }
  const id = tx.id != null ? String(tx.id) : "";
  if (!id) {
    return null;
  }

  const metadata = asRecord(tx.metadata);
  let documentDate: string | null = null;
  if (metadata && metadata.documentDate != null) {
    const d = String(metadata.documentDate).trim();
    documentDate = d || null;
  }

  const df = tx.documentFolio != null ? String(tx.documentFolio).trim() : "";
  const subtotal = Number(tx.subtotal) || 0;
  const taxAmount = Number(tx.taxAmount) || 0;
  const total = Number(tx.total) || 0;
  let createdAtIso: string | null = null;
  if (tx.createdAt instanceof Date) {
    createdAtIso = tx.createdAt.toISOString();
  } else if (tx.createdAt != null) {
    const d = new Date(String(tx.createdAt));
    if (!Number.isNaN(d.getTime())) {
      createdAtIso = d.toISOString();
    }
  }

  return {
    id,
    documentNumber: tx.documentNumber != null ? String(tx.documentNumber) : "—",
    documentFolio: df || null,
    status: tx.status != null ? String(tx.status) : "",
    supplierName: supplierNameFromRow(tx),
    supplierDocumentNumber: supplierDocumentNumberFromRow(tx),
    branchName: branchNameFromRow(tx),
    documentDate,
    subtotal,
    taxAmount,
    total,
    createdAtIso,
  };
}

export async function listPurchaseOrdersForGrid(input: {
  page: number;
  limit: number;
  search?: string;
  branchId?: string;
}): Promise<{ rows: PurchaseOrderGridRow[]; total: number }> {
  const r = await TransactionsSearchRequest.search({
    page: input.page,
    limit: input.limit,
    type: "PURCHASE_ORDER",
    search: input.search,
    branchId: input.branchId,
  });
  const rows = r.rows
    .map((row) => normalizePurchaseOrderRow(row))
    .filter((x): x is PurchaseOrderGridRow => x != null);

  return { rows, total: r.total };
}

/** Búsqueda ligera de OC para asociar en recepción (builder cliente). */
export async function searchPurchaseOrdersForReceptionAction(
  query: string,
): Promise<{ rows: Array<{ id: string; documentNumber: string }> }> {
  const q = query.trim();
  if (!q) {
    return { rows: [] };
  }
  const result = await listPurchaseOrdersForGrid({ page: 1, limit: 20, search: q });
  return {
    rows: result.rows.map((r) => ({
      id: r.id,
      documentNumber: r.documentNumber,
    })),
  };
}
