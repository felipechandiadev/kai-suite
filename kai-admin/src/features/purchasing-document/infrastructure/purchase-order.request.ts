import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { CreatePurchaseOrderInput } from "../types/purchase-order.types";

function formatApiError(json: unknown, status: number): string {
  if (!json || typeof json !== "object") {
    return `Error ${status}`;
  }
  const o = json as Record<string, unknown>;
  if (typeof o.message === "string") {
    return o.message;
  }
  if (Array.isArray(o.message)) {
    return o.message.map(String).join("; ");
  }
  if (typeof o.error === "string") {
    return o.error;
  }
  return `Error ${status}`;
}

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
  const activeCompanyId = (session?.user as any)?.activeCompanyId as string | null | undefined;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  if (activeCompanyId) {
    h["X-Active-Company-Id"] = activeCompanyId;
  }
  return h;
}

export class PurchaseOrderRequest {
  static async create(
    input: CreatePurchaseOrderInput & { userId: string },
  ): Promise<{ success: true; id: string; documentNumber?: string } | { success: false; error: string }> {
    const headers = await authHeaders();
    const storageId = input.storageId?.trim();
    const supplierTrim = input.supplierId?.trim();
    const draft = input.saveAsDraft === true;
    const body: Record<string, unknown> = {
      userId: input.userId,
      branchId: input.branchId,
      ...(supplierTrim ? { supplierId: supplierTrim } : {}),
      ...(storageId ? { storageId } : {}),
      documentDate: input.documentDate,
      documentFolio: input.documentFolio?.trim() || undefined,
      ...(input.notes != null && String(input.notes).trim() !== ""
        ? { notes: String(input.notes).trim() }
        : {}),
      ...(draft ? { saveAsDraft: true } : {}),
      lines: (input.lines ?? []).map((l) => ({
        productId: l.productId,
        variantId: l.variantId,
        productName: l.productName,
        sku: l.sku,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxIds: l.taxIds,
      })),
    };

    try {
      const res = await fetch(apiUrl("purchase-orders"), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!res.ok) {
        const msg = formatApiError(json, res.status);
        return { success: false, error: msg };
      }
      const id = json?.id != null ? String(json.id) : "";
      if (!id) {
        return { success: false, error: "Respuesta sin id de transacción." };
      }
      const documentNumber =
        json?.documentNumber != null ? String(json.documentNumber) : undefined;
      return { success: true, id, documentNumber };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error de red";
      return { success: false, error: msg };
    }
  }
}
