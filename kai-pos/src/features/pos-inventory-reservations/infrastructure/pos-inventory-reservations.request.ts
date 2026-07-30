import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";

export type PosInventoryReservationSummary = {
  id: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  quantityInBase?: number;
  unitOfMeasure?: string;
  customerId: string;
  customerName: string;
  storageId: string;
  storageName: string;
  branchId: string;
  branchName: string;
  createdAt: string;
  expiresAt?: string;
  orderReference?: string;
  notes?: string;
  isExpired: boolean;
};

export class PosInventoryReservationsRequest {
  static async listActive(input: {
    storageId: string;
    variantId?: string | null;
    productId?: string | null;
    customerId?: string | null;
  }): Promise<
    | { success: true; reservations: PosInventoryReservationSummary[] }
    | { success: false; message: string; statusCode?: number }
  > {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      return { success: false, message: "BACKEND_API_URL no está configurada" };
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const activeCompanyId = (session?.user as any)?.activeCompanyId as string | null | undefined;
    if (!token) {
      return { success: false, message: "No autenticado" };
    }

    const storageId = input.storageId?.trim();
    if (!storageId) {
      return { success: false, message: "storageId es requerido" };
    }

    const qs = new URLSearchParams();
    qs.set("storageId", storageId);
    if (input.variantId?.trim()) qs.set("variantId", input.variantId.trim());
    if (input.productId?.trim()) qs.set("productId", input.productId.trim());
    if (input.customerId?.trim()) qs.set("customerId", input.customerId.trim());

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;

      const res = await fetch(`${base}/api/inventory-transactions/reservations?${qs.toString()}`, {
        method: "GET",
        headers,
        cache: "no-store",
      });

      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) {
        const msg =
          (typeof data?.message === "string" && data.message) ||
          (Array.isArray(data?.message) ? data.message.join("; ") : null) ||
          `HTTP ${res.status}`;
        return { success: false, message: String(msg), statusCode: res.status };
      }
      const rows = Array.isArray(data) ? data : [];
      const reservations: PosInventoryReservationSummary[] = rows
        .map((r) => {
          if (!r || typeof r !== "object") return null;
          const id = r.id != null ? String(r.id) : "";
          const storageId = r.storageId != null ? String(r.storageId) : "";
          const productId = r.productId != null ? String(r.productId) : "";
          const customerId = r.customerId != null ? String(r.customerId) : "";
          const branchId = r.branchId != null ? String(r.branchId) : "";
          if (!id || !storageId || !productId || !customerId || !branchId) return null;
          return {
            id,
            productId,
            productName: String(r.productName ?? ""),
            variantId: r.variantId != null ? String(r.variantId) : undefined,
            variantName: r.variantName != null ? String(r.variantName) : undefined,
            quantity: Number(r.quantity ?? 0),
            quantityInBase:
              r.quantityInBase === null || r.quantityInBase === undefined
                ? undefined
                : Number(r.quantityInBase),
            unitOfMeasure:
              r.unitOfMeasure != null && String(r.unitOfMeasure).trim()
                ? String(r.unitOfMeasure).trim()
                : undefined,
            customerId,
            customerName: String(r.customerName ?? ""),
            storageId,
            storageName: String(r.storageName ?? ""),
            branchId,
            branchName: String(r.branchName ?? ""),
            createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date(0).toISOString(),
            expiresAt: r.expiresAt ? new Date(r.expiresAt).toISOString() : undefined,
            orderReference: r.orderReference != null ? String(r.orderReference) : undefined,
            notes: r.notes != null ? String(r.notes) : undefined,
            isExpired: Boolean(r.isExpired),
          };
        })
        .filter((x): x is PosInventoryReservationSummary => x != null);

      return { success: true, reservations };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error de red";
      return { success: false, message: err };
    }
  }
}

