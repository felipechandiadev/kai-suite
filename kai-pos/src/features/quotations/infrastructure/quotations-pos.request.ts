import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { QuotationDetail } from "../types/quotation.types";

async function authHeaders(): Promise<HeadersInit | null> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  if (!token) return null;
  const activeCompanyId = (
    session?.user as { activeCompanyId?: string | null }
  )?.activeCompanyId;
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (activeCompanyId) h["X-Active-Company-Id"] = activeCompanyId;
  return h;
}

function apiUrl(path: string): string | null {
  const base = process.env.BACKEND_API_URL;
  if (!base) return null;
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

export interface CreateQuotationLinePosPayload {
  productId?: string;
  productVariantId?: string;
  unitId?: string;
  productName: string;
  productSku?: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  taxAmount?: number;
  subtotal?: number;
  total?: number;
}

export interface CreateQuotationPosPayload {
  branchId: string;
  pointOfSaleId?: string;
  customerId?: string;
  customerName?: string;
  customerDocument?: string;
  customerPhone?: string;
  priceListId?: string;
  validUntil?: string;
  notes?: string;
  currency?: string;
  lines: CreateQuotationLinePosPayload[];
}

export class QuotationsPosRequest {
  static async create(
    payload: CreateQuotationPosPayload,
  ): Promise<
    | { success: true; quotation: QuotationDetail }
    | { success: false; message: string }
  > {
    const url = apiUrl("quotations");
    if (!url) {
      return { success: false, message: "BACKEND_API_URL no está configurada" };
    }
    const headers = await authHeaders();
    if (!headers) return { success: false, message: "No autenticado" };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        quotation?: QuotationDetail;
        message?: string;
      };
      if (!res.ok || !data?.quotation) {
        const msg =
          (typeof data?.message === "string" && data.message) ||
          `HTTP ${res.status}`;
        return { success: false, message: msg };
      }
      return { success: true, quotation: data.quotation };
    } catch (e) {
      return {
        success: false,
        message: e instanceof Error ? e.message : "Error de red",
      };
    }
  }

  static async findByDocumentNumber(
    documentNumber: string,
  ): Promise<
    | { success: true; quotation: QuotationDetail | null }
    | { success: false; message: string }
  > {
    const url = apiUrl(
      `quotations/by-document-number/${encodeURIComponent(documentNumber)}`,
    );
    if (!url) {
      return { success: false, message: "BACKEND_API_URL no está configurada" };
    }
    const headers = await authHeaders();
    if (!headers) return { success: false, message: "No autenticado" };

    try {
      const res = await fetch(url, {
        method: "GET",
        headers,
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        quotation?: QuotationDetail | null;
        message?: string;
      };
      if (!res.ok) {
        const msg =
          (typeof data?.message === "string" && data.message) ||
          `HTTP ${res.status}`;
        return { success: false, message: msg };
      }
      return { success: true, quotation: data.quotation ?? null };
    } catch (e) {
      return {
        success: false,
        message: e instanceof Error ? e.message : "Error de red",
      };
    }
  }

  static async convertToSale(
    id: string,
    payload: {
      cashSessionId?: string;
      pointOfSaleId?: string;
    },
  ): Promise<
    | {
        success: true;
        targetTransactionId: string;
        targetTransactionDocumentNumber: string;
      }
    | { success: false; message: string }
  > {
    const url = apiUrl(`quotations/${encodeURIComponent(id)}/convert`);
    if (!url) {
      return { success: false, message: "BACKEND_API_URL no está configurada" };
    }
    const headers = await authHeaders();
    if (!headers) return { success: false, message: "No autenticado" };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ ...payload, targetType: "SALE" }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        targetTransactionId?: string;
        targetTransactionDocumentNumber?: string;
        message?: string;
      };
      if (!res.ok || !data?.targetTransactionId) {
        const msg =
          (typeof data?.message === "string" && data.message) ||
          `HTTP ${res.status}`;
        return { success: false, message: msg };
      }
      return {
        success: true,
        targetTransactionId: data.targetTransactionId,
        targetTransactionDocumentNumber:
          data.targetTransactionDocumentNumber ?? "",
      };
    } catch (e) {
      return {
        success: false,
        message: e instanceof Error ? e.message : "Error de red",
      };
    }
  }
}
