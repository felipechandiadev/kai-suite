import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  SalesPaymentMethod,
  SalesPaymentStatus,
} from "@/features/sales-payments/types/sales-payment.types";
import type {
  LinkedCreditNoteListSummary,
  SalesTransactionListRow,
  SalesTransactionsListResult,
} from "../types/sales-transaction-list.types";
import type { CustomerCreditNoteUsageStatus } from "@/features/sales-customers/types/customer-related-documents.types";
import { countPaymentSnapshotsFromMetadata } from "../lib/format-sale-payment-method";
import { resolveSaleCollectionStatus } from "../lib/sale-collection-status";
import type { RelatedSalePaymentFolio } from "../types/sales-transaction-list.types";

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) {
    throw new Error("BACKEND_API_URL no está definida");
  }
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function authHeaders(): Promise<HeadersInit> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = (session?.user as any)?.activeCompanyId as
    | string
    | null
    | undefined;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  if (activeCompanyId) {
    h["X-Active-Company-Id"] = activeCompanyId;
  }
  return h;
}

/** @deprecated Ya no se usa el listado mixto; ver `listSales` / `listCustomerReturns`. */
export const SALES_TRANSACTIONS_TYPES_CSV = "SALE,SALE_RETURN";

export interface ListSalesTransactionsParams {
  page?: number;
  limit?: number;
  status?: SalesPaymentStatus;
  paymentMethod?: SalesPaymentMethod;
  branchId?: string;
  pointOfSaleId?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

function appendSalesListParams(
  q: URLSearchParams,
  params: ListSalesTransactionsParams,
): void {
  if (params.page != null) q.set("page", String(params.page));
  const limit = params.limit ?? 50;
  if (limit != null) q.set("limit", String(limit));
  if (params.status) q.set("status", params.status);
  if (params.paymentMethod) q.set("paymentMethod", params.paymentMethod);
  if (params.branchId) q.set("branchId", params.branchId);
  if (params.pointOfSaleId) q.set("pointOfSaleId", params.pointOfSaleId);
  if (params.customerId) q.set("customerId", params.customerId);
  if (params.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params.dateTo) q.set("dateTo", params.dateTo);
  if (params.search) q.set("search", params.search);
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function fetchSalesTransactionsList(
  path:
    | "transactions/sales"
    | "transactions/customer-returns"
    | "transactions/backorders",
  params: ListSalesTransactionsParams,
): Promise<
  | { success: true; data: SalesTransactionsListResult }
  | { success: false; error: string }
> {
  try {
    const q = new URLSearchParams();
    appendSalesListParams(q, params);

    const res = await fetch(apiUrl(`${path}?${q.toString()}`), {
      method: "GET",
      headers: await authHeaders(),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as {
      data?: unknown[];
      total?: number;
      page?: number;
      limit?: number;
      message?: string;
    };
    if (!res.ok) {
      return { success: false, error: data?.message || res.statusText };
    }
    const arr = Array.isArray(data?.data) ? data.data : [];
    const rows = arr
      .map(normalizeRow)
      .filter((x): x is SalesTransactionListRow => x != null);
    return {
      success: true,
      data: {
        rows,
        total: typeof data?.total === "number" ? data.total : rows.length,
        page: typeof data?.page === "number" ? data.page : 1,
        limit:
          typeof data?.limit === "number" ? data.limit : params.limit ?? 50,
      },
    };
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error ? e.message : "Error al cargar transacciones",
    };
  }
}

function derivePersonName(
  entity: Record<string, unknown> | null | undefined,
): string | null {
  if (!entity || typeof entity !== "object") return null;
  const person = (entity as { person?: Record<string, unknown> }).person;
  if (!person || typeof person !== "object") return null;
  const businessName =
    typeof person.businessName === "string" ? person.businessName.trim() : "";
  if (businessName) return businessName;
  const firstName =
    typeof person.firstName === "string" ? person.firstName.trim() : "";
  const lastName =
    typeof person.lastName === "string" ? person.lastName.trim() : "";
  const full = `${firstName} ${lastName}`.trim();
  return full || null;
}

function derivePersonDocument(
  entity: Record<string, unknown> | null | undefined,
): string | null {
  if (!entity || typeof entity !== "object") return null;
  const person = (entity as { person?: Record<string, unknown> }).person;
  if (!person || typeof person !== "object") return null;
  return typeof person.documentNumber === "string" &&
    person.documentNumber.trim()
    ? person.documentNumber.trim()
    : null;
}

function counterpartyFromRaw(o: Record<string, unknown>): string | null {
  const customer = o.customer as Record<string, unknown> | null | undefined;
  const supplier = o.supplier as Record<string, unknown> | null | undefined;
  const cName = derivePersonName(customer);
  const cDoc = derivePersonDocument(customer);
  if (cName) return cDoc ? `${cName} (${cDoc})` : cName;
  const sName = derivePersonName(supplier);
  const sDoc = derivePersonDocument(supplier);
  if (sName) return sDoc ? `${sName} (${sDoc})` : sName;
  return null;
}

function pushPaymentFolio(
  out: RelatedSalePaymentFolio[],
  seen: Set<string>,
  item: Record<string, unknown>,
): void {
  const id = item.id != null ? String(item.id).trim() : "";
  const documentNumber =
    typeof item.documentNumber === "string" ? item.documentNumber.trim() : "";
  if (!id && !documentNumber) return;
  const key = id || documentNumber;
  if (seen.has(key)) return;
  seen.add(key);
  out.push({
    id: id || documentNumber,
    documentNumber: documentNumber || "—",
  });
}

function relatedSalePaymentsFromRaw(
  o: Record<string, unknown>,
): RelatedSalePaymentFolio[] {
  const out: RelatedSalePaymentFolio[] = [];
  const seen = new Set<string>();

  const raw =
    o.relatedSalePayments ??
    (o as { related_sale_payments?: unknown }).related_sale_payments;
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      pushPaymentFolio(out, seen, item as Record<string, unknown>);
    }
  }

  const inverse = o.inverseRelations;
  if (Array.isArray(inverse)) {
    for (const item of inverse) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const txType =
        typeof row.transactionType === "string"
          ? row.transactionType.trim()
          : "";
      if (txType && txType !== "PAYMENT_IN") continue;
      pushPaymentFolio(out, seen, row);
    }
  }

  return out;
}

function userFullNameFromRaw(o: Record<string, unknown>): string | null {
  const user = o.user as Record<string, unknown> | null | undefined;
  if (!user || typeof user !== "object") return null;
  const person = (user as { person?: Record<string, unknown> }).person;
  if (!person || typeof person !== "object") return null;
  const firstName =
    typeof person.firstName === "string" ? person.firstName.trim() : "";
  const lastName =
    typeof person.lastName === "string" ? person.lastName.trim() : "";
  const full = `${firstName} ${lastName}`.trim();
  return full || null;
}

function parseLinkedCreditNote(
  raw: unknown,
): LinkedCreditNoteListSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id.trim() : "";
  if (!id) return null;
  const usage = String(o.usageStatus ?? "").trim();
  const usageStatus: CustomerCreditNoteUsageStatus =
    usage === "fully_used" ||
    usage === "partially_used" ||
    usage === "available"
      ? usage
      : "available";
  return {
    id,
    documentNumber:
      typeof o.documentNumber === "string" ? o.documentNumber : id,
    total: Math.round(toNumber(o.total)),
    consumedAmount: Math.round(toNumber(o.consumedAmount)),
    availableAmount: Math.round(toNumber(o.availableAmount)),
    usageStatus,
  };
}

function normalizeRow(raw: unknown): SalesTransactionListRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  if (!id) return null;
  const branch = o.branch as Record<string, unknown> | null | undefined;
  const pos = o.pointOfSale as Record<string, unknown> | null | undefined;
  const txType =
    typeof o.transactionType === "string" && o.transactionType.trim()
      ? o.transactionType.trim()
      : typeof o.type === "string" && o.type.trim()
        ? o.type.trim()
        : "";
  const meta =
    o.metadata && typeof o.metadata === "object"
      ? (o.metadata as Record<string, unknown>)
      : null;
  const bo =
    meta?.backorder && typeof meta.backorder === "object"
      ? (meta.backorder as Record<string, unknown>)
      : null;
  const depositFromMeta = bo ? toNumber(bo.depositAmount) : 0;
  const total = toNumber(o.total);
  const amountPaid = toNumber(o.amountPaid);
  const paymentStatusRaw =
    typeof o.paymentStatus === "string" ? o.paymentStatus : null;
  const relatedPaymentFolios =
    txType === "SALE" ? relatedSalePaymentsFromRaw(o) : [];
  const documentType =
    typeof o.documentType === "string" && o.documentType.trim()
      ? o.documentType.trim()
      : null;
  const documentFolio =
    typeof o.documentFolio === "string" && o.documentFolio.trim()
      ? o.documentFolio.trim()
      : null;
  return {
    id,
    documentNumber:
      typeof o.documentNumber === "string" ? o.documentNumber : "",
    documentType,
    documentFolio,
    transactionType: txType,
    status: (o.status as SalesPaymentStatus) ?? "CONFIRMED",
    collectionStatus: resolveSaleCollectionStatus({
      paymentStatus: paymentStatusRaw,
      total,
      amountPaid,
    }),
    relatedPaymentFolios,
    total,
    amountPaid,
    backorderDepositAmount:
      txType === "BACKORDER" && depositFromMeta > 0
        ? depositFromMeta
        : txType === "BACKORDER"
          ? toNumber(o.amountPaid)
          : null,
    backorderPercent:
      bo && Number.isFinite(Number(bo.depositPercent))
        ? Math.round(Number(bo.depositPercent))
        : null,
    backorderReservationStatus:
      txType === "BACKORDER" &&
      bo &&
      typeof bo.reservationStatus === "string" &&
      bo.reservationStatus.trim()
        ? bo.reservationStatus.trim()
        : txType === "BACKORDER"
          ? "OPEN"
          : null,
    orderOrigin:
      meta && typeof meta.source === "string" && meta.source.trim()
        ? meta.source.trim()
        : txType === "BACKORDER"
          ? "pos"
          : null,
    paymentMethod: (o.paymentMethod as SalesPaymentMethod) ?? "CASH",
    paymentLinesCount: countPaymentSnapshotsFromMetadata(meta),
    linkedCreditNote:
      txType === "SALE_RETURN" ? parseLinkedCreditNote(o.linkedCreditNote) : null,
    branchName:
      branch && typeof branch.name === "string" && branch.name.trim()
        ? branch.name
        : null,
    pointOfSaleName:
      pos && typeof pos.name === "string" && pos.name.trim() ? pos.name : null,
    counterpartyLabel: counterpartyFromRaw(o),
    userFullName: userFullNameFromRaw(o),
    createdAt: typeof o.createdAt === "string" ? o.createdAt : "",
  };
}

export class SalesTransactionsListRequest {
  /** Solo ventas (`SALE`) — `GET /transactions/sales`. */
  static listSales(params: ListSalesTransactionsParams = {}) {
    return fetchSalesTransactionsList("transactions/sales", params);
  }

  /** Solo devoluciones de venta a cliente (`SALE_RETURN`) — `GET /transactions/customer-returns`. */
  static listCustomerReturns(params: ListSalesTransactionsParams = {}) {
    return fetchSalesTransactionsList("transactions/customer-returns", params);
  }

  /** Solo encargos / reservas (`BACKORDER`) — `GET /transactions/backorders`. */
  static listBackorders(params: ListSalesTransactionsParams = {}) {
    return fetchSalesTransactionsList("transactions/backorders", params);
  }

  /** Alias de `listSales` (compatibilidad). */
  static list(params: ListSalesTransactionsParams = {}) {
    return SalesTransactionsListRequest.listSales(params);
  }
}
