import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  SupplierPaymentMethod,
  SupplierPaymentRow,
  SupplierPaymentStatus,
  SupplierPaymentsListResult,
} from "../types/supplier-payment.types";

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
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })
    ?.activeCompanyId;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  if (activeCompanyId) {
    h["X-Active-Company-Id"] = activeCompanyId;
  }
  return h;
}

export interface ListSupplierPaymentsParams {
  page?: number;
  limit?: number;
  supplierId?: string;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function deriveSupplierName(
  supplier: Record<string, unknown> | null | undefined,
): string | null {
  if (!supplier || typeof supplier !== "object") return null;
  const person = (supplier as { person?: Record<string, unknown> }).person;
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

function deriveSupplierDocument(
  supplier: Record<string, unknown> | null | undefined,
): string | null {
  if (!supplier || typeof supplier !== "object") return null;
  const person = (supplier as { person?: Record<string, unknown> }).person;
  if (!person || typeof person !== "object") return null;
  return typeof person.documentNumber === "string" &&
    person.documentNumber.trim()
    ? person.documentNumber.trim()
    : null;
}

function normalizeRow(raw: unknown): SupplierPaymentRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  if (!id) return null;

  const supplier = o.supplier as Record<string, unknown> | null | undefined;
  const branch = o.branch as Record<string, unknown> | null | undefined;
  const relatedTx = o.relatedTransaction as
    | Record<string, unknown>
    | null
    | undefined;
  const meta =
    o.metadata && typeof o.metadata === "object"
      ? (o.metadata as Record<string, unknown>)
      : null;

  const installmentRaw = meta?.installmentNumber;
  const totalInstRaw = meta?.totalInstallments;
  const installmentNumber =
    installmentRaw != null && Number.isFinite(Number(installmentRaw))
      ? Number(installmentRaw)
      : null;
  const totalInstallments =
    totalInstRaw != null && Number.isFinite(Number(totalInstRaw))
      ? Number(totalInstRaw)
      : null;

  return {
    id,
    documentNumber:
      typeof o.documentNumber === "string" ? o.documentNumber : "",
    supplierId:
      typeof o.supplierId === "string" && o.supplierId.trim()
        ? o.supplierId
        : null,
    supplierName: deriveSupplierName(supplier),
    supplierDocument: deriveSupplierDocument(supplier),
    branchId:
      typeof o.branchId === "string" && o.branchId.trim() ? o.branchId : null,
    branchName:
      branch && typeof branch.name === "string" && branch.name.trim()
        ? branch.name
        : null,
    total: toNumber(o.total),
    amountPaid: toNumber(o.amountPaid),
    currency: typeof o.currency === "string" && o.currency ? o.currency : "CLP",
    paymentMethod: (o.paymentMethod as SupplierPaymentMethod) ?? "CASH",
    paymentStatus:
      typeof o.paymentStatus === "string" && o.paymentStatus.trim()
        ? o.paymentStatus
        : null,
    status: (o.status as SupplierPaymentStatus) ?? "CONFIRMED",
    relatedTransactionId:
      typeof o.relatedTransactionId === "string" &&
      o.relatedTransactionId.trim()
        ? o.relatedTransactionId.trim()
        : null,
    relatedDocumentNumber:
      relatedTx &&
      typeof relatedTx.documentNumber === "string" &&
      relatedTx.documentNumber.trim()
        ? relatedTx.documentNumber.trim()
        : null,
    relatedDocumentType:
      relatedTx &&
      typeof relatedTx.transactionType === "string" &&
      relatedTx.transactionType.trim()
        ? relatedTx.transactionType.trim()
        : null,
    installmentNumber,
    totalInstallments,
    notes: typeof o.notes === "string" && o.notes.trim() ? o.notes : null,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : "",
  };
}

/**
 * Lista pagos a proveedor ya ejecutados (salen de CxP).
 * Filtra `SUPPLIER_PAYMENT` con `status=CONFIRMED` (excluye borradores pendientes).
 */
export class SupplierPaymentsRequest {
  static async list(
    params: ListSupplierPaymentsParams = {},
  ): Promise<
    | { success: true; data: SupplierPaymentsListResult }
    | { success: false; error: string }
  > {
    try {
      const q = new URLSearchParams();
      q.set("type", "SUPPLIER_PAYMENT");
      q.set("status", "CONFIRMED");
      if (params.page != null) q.set("page", String(params.page));
      if (params.limit != null) q.set("limit", String(params.limit));
      if (params.supplierId) q.set("supplierId", params.supplierId);
      if (params.paymentMethod) q.set("paymentMethod", params.paymentMethod);
      if (params.dateFrom) q.set("dateFrom", params.dateFrom);
      if (params.dateTo) q.set("dateTo", params.dateTo);
      if (params.search) q.set("search", params.search);

      const res = await fetch(apiUrl(`transactions?${q.toString()}`), {
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
        .filter((x): x is SupplierPaymentRow => x != null);
      return {
        success: true,
        data: {
          rows,
          total: typeof data?.total === "number" ? data.total : rows.length,
          page: typeof data?.page === "number" ? data.page : 1,
          limit:
            typeof data?.limit === "number" ? data.limit : params.limit ?? 25,
        },
      };
    } catch (e) {
      return {
        success: false,
        error:
          e instanceof Error ? e.message : "Error al cargar pagos a proveedor",
      };
    }
  }
}
