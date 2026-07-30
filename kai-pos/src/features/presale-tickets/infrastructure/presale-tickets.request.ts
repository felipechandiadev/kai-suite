import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { PresaleTicketDetail } from "../types/presale-ticket.types";

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) throw new Error("BACKEND_API_URL no está definida");
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function authHeaders(): Promise<HeadersInit> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = (session?.user as { activeCompanyId?: string })?.activeCompanyId;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  if (activeCompanyId) h["X-Active-Company-Id"] = activeCompanyId;
  return h;
}

export class PresaleTicketsRequest {
  static async create(body: {
    presalePointOfSaleId: string;
    priceListId: string;
    lines: Array<{
      productId?: string;
      productVariantId?: string;
      productName: string;
      productSku?: string;
      variantName?: string;
      quantity: number;
      unitPrice: number;
      discountAmount?: number;
      taxRate?: number;
      taxAmount?: number;
      subtotal: number;
      total: number;
      unitOfMeasure?: string;
      promotionSnapshot?: Record<string, unknown>;
    }>;
    customerId?: string;
    customerName?: string;
    customerDocument?: string;
    subtotal?: number;
    taxAmount?: number;
    discountAmount?: number;
    total: number;
    promotionsSnapshot?: Record<string, unknown>[];
  }) {
    try {
      const res = await fetch(apiUrl("presale-tickets"), {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        ticket?: PresaleTicketDetail;
        message?: string | string[];
      };
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join("; ") : data.message;
        return { success: false as const, message: msg || res.statusText };
      }
      if (!data.ticket) {
        return { success: false as const, message: "Respuesta inválida del servidor" };
      }
      return { success: true as const, ticket: data.ticket };
    } catch (e) {
      return {
        success: false as const,
        message: e instanceof Error ? e.message : "Error al crear ticket",
      };
    }
  }

  static async findByCode(code: string, pointOfSaleId: string) {
    const trimmed = code.trim().toUpperCase();
    const qs = new URLSearchParams({ pointOfSaleId });
    try {
      const res = await fetch(
        apiUrl(`presale-tickets/by-code/${encodeURIComponent(trimmed)}?${qs}`),
        { method: "GET", headers: await authHeaders(), cache: "no-store" },
      );
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        ticket?: PresaleTicketDetail | null;
        message?: string | string[];
      };
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join("; ") : data.message;
        return { success: false as const, message: msg || res.statusText, ticket: null };
      }
      return { success: true as const, ticket: data.ticket ?? null };
    } catch (e) {
      return {
        success: false as const,
        message: e instanceof Error ? e.message : "Error al buscar ticket",
        ticket: null,
      };
    }
  }
}
