import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  QuotationDetail,
  QuotationEffectiveStatus,
  QuotationRow,
} from "../types/quotation.types";

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

export interface ListQuotationsParams {
  effectiveStatus?: QuotationEffectiveStatus;
  search?: string;
  customerId?: string;
  branchId?: string;
  pointOfSaleId?: string;
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateQuotationLinePayload {
  productId?: string;
  productVariantId?: string;
  unitId?: string;
  productName: string;
  productSku?: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  discountPercentage?: number;
  discountAmount?: number;
  taxId?: string;
  taxRate?: number;
  taxAmount?: number;
  subtotal?: number;
  total?: number;
  notes?: string;
}

export interface CreateQuotationPayload {
  branchId: string;
  pointOfSaleId?: string;
  customerId?: string;
  customerName?: string;
  customerDocument?: string;
  customerPhone?: string;
  priceListId?: string;
  validUntil?: string;
  terms?: string;
  notes?: string;
  currency?: string;
  lines: CreateQuotationLinePayload[];
}

export interface ConvertQuotationPayload {
  targetType?: "SALE" | "CUSTOMER_ORDER";
  cashSessionId?: string;
  pointOfSaleId?: string;
  notes?: string;
}

export class QuotationsRequest {
  static async list(
    params: ListQuotationsParams = {},
  ): Promise<
    | {
        success: true;
        items: QuotationRow[];
        total: number;
        page: number;
        limit: number;
      }
    | { success: false; error: string }
  > {
    try {
      const q = new URLSearchParams();
      if (params.effectiveStatus)
        q.set("effectiveStatus", params.effectiveStatus);
      if (params.search) q.set("search", params.search);
      if (params.customerId) q.set("customerId", params.customerId);
      if (params.branchId) q.set("branchId", params.branchId);
      if (params.pointOfSaleId) q.set("pointOfSaleId", params.pointOfSaleId);
      if (params.dateFrom) q.set("dateFrom", params.dateFrom);
      if (params.dateTo) q.set("dateTo", params.dateTo);
      if (params.page != null) q.set("page", String(params.page));
      if (params.limit != null) q.set("limit", String(params.limit));
      const qs = q.toString();
      const res = await fetch(apiUrl(`quotations${qs ? `?${qs}` : ""}`), {
        method: "GET",
        headers: await authHeaders(),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        items?: QuotationRow[];
        total?: number;
        page?: number;
        limit?: number;
        message?: string;
      };
      if (!res.ok) {
        return { success: false, error: data?.message || res.statusText };
      }
      return {
        success: true,
        items: Array.isArray(data?.items) ? data.items : [],
        total: typeof data?.total === "number" ? data.total : 0,
        page: typeof data?.page === "number" ? data.page : 1,
        limit: typeof data?.limit === "number" ? data.limit : 25,
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al cargar cotizaciones",
      };
    }
  }

  static async getById(
    id: string,
  ): Promise<
    | { success: true; quotation: QuotationDetail }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(apiUrl(`quotations/${encodeURIComponent(id)}`), {
        method: "GET",
        headers: await authHeaders(),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        quotation?: QuotationDetail;
        message?: string;
      };
      if (!res.ok || !data?.quotation) {
        return { success: false, error: data?.message || res.statusText };
      }
      return { success: true, quotation: data.quotation };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al cargar cotización",
      };
    }
  }

  static async getByDocumentNumber(
    documentNumber: string,
  ): Promise<
    | { success: true; quotation: QuotationDetail | null }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(
        apiUrl(
          `quotations/by-document-number/${encodeURIComponent(documentNumber)}`,
        ),
        {
          method: "GET",
          headers: await authHeaders(),
          cache: "no-store",
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        quotation?: QuotationDetail | null;
        message?: string;
      };
      if (!res.ok) {
        return { success: false, error: data?.message || res.statusText };
      }
      return { success: true, quotation: data.quotation ?? null };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al buscar cotización",
      };
    }
  }

  static async create(
    payload: CreateQuotationPayload,
  ): Promise<
    | { success: true; quotation: QuotationDetail }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(apiUrl("quotations"), {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        quotation?: QuotationDetail;
        message?: string;
      };
      if (!res.ok || !data?.quotation) {
        return { success: false, error: data?.message || res.statusText };
      }
      return { success: true, quotation: data.quotation };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al crear cotización",
      };
    }
  }

  static async cancel(
    id: string,
    reason?: string,
  ): Promise<
    | { success: true; quotation: QuotationDetail }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(
        apiUrl(`quotations/${encodeURIComponent(id)}/cancel`),
        {
          method: "POST",
          headers: await authHeaders(),
          body: JSON.stringify({ reason: reason ?? null }),
          cache: "no-store",
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        quotation?: QuotationDetail;
        message?: string;
      };
      if (!res.ok || !data?.quotation) {
        return { success: false, error: data?.message || res.statusText };
      }
      return { success: true, quotation: data.quotation };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al anular cotización",
      };
    }
  }

  static async convert(
    id: string,
    payload: ConvertQuotationPayload = {},
  ): Promise<
    | {
        success: true;
        targetTransactionId: string;
        targetTransactionDocumentNumber: string;
        targetType: string;
        expiredAtConversion: boolean;
      }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(
        apiUrl(`quotations/${encodeURIComponent(id)}/convert`),
        {
          method: "POST",
          headers: await authHeaders(),
          body: JSON.stringify(payload ?? {}),
          cache: "no-store",
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        targetTransactionId?: string;
        targetTransactionDocumentNumber?: string;
        targetType?: string;
        expiredAtConversion?: boolean;
        message?: string;
      };
      if (!res.ok || !data?.targetTransactionId) {
        return { success: false, error: data?.message || res.statusText };
      }
      return {
        success: true,
        targetTransactionId: data.targetTransactionId,
        targetTransactionDocumentNumber:
          data.targetTransactionDocumentNumber ?? "",
        targetType: data.targetType ?? "SALE",
        expiredAtConversion: !!data.expiredAtConversion,
      };
    } catch (e) {
      return {
        success: false,
        error:
          e instanceof Error ? e.message : "Error al convertir cotización",
      };
    }
  }
}
