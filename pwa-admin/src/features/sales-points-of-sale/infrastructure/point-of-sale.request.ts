import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { PointOfSaleListItem, PosKind } from "../types/point-of-sale.types";

type PointOfSaleWriteBody = {
  name: string;
  branchId: string;
  storageId: string;
  deviceId: string | null;
  isActive: boolean;
  priceLists: Array<{ id: string; name: string; isActive: boolean }>;
  defaultPriceListId: string | null;
  kind?: PosKind;
  acceptsPresaleTickets?: boolean;
  allowsDeferredPayment?: boolean;
};

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

export class PointOfSaleRequest {
  /** Listado; `includeInactive` alineado a `GET /api/points-of-sale?includeInactive=…` (admin: todos). */
  static async findAll(
    includeInactive = true,
  ): Promise<{ success: true; pointsOfSale: PointOfSaleListItem[] } | { success: false; error: string; pointsOfSale: [] }> {
    const headers = await authHeaders();
    const q = includeInactive ? "?includeInactive=true" : "";
    try {
      const res = await fetch(`${apiUrl("points-of-sale")}${q}`, {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        const t = await res.text();
        return { success: false, error: t || res.statusText, pointsOfSale: [] };
      }
      const data = (await res.json()) as { success?: boolean; pointsOfSale?: PointOfSaleListItem[] };
      if (data?.pointsOfSale && Array.isArray(data.pointsOfSale)) {
        return { success: true, pointsOfSale: data.pointsOfSale };
      }
      return { success: true, pointsOfSale: [] };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al listar puntos de venta";
      return { success: false, error: err, pointsOfSale: [] };
    }
  }

  static async findById(
    id: string,
  ): Promise<
    { success: true; pointOfSale: PointOfSaleListItem } | { success: false; error: string }
  > {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`points-of-sale/${encodeURIComponent(id)}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        pointOfSale?: PointOfSaleListItem;
        message?: string;
        error?: string;
      };
      if (!res.ok || data.success !== true || !data.pointOfSale) {
        return {
          success: false,
          error: data.message || data.error || res.statusText || "Punto de venta no encontrado",
        };
      }
      return { success: true, pointOfSale: data.pointOfSale };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al cargar el punto de venta";
      return { success: false, error: err };
    }
  }

  static async update(
    id: string,
    body: PointOfSaleWriteBody,
  ): Promise<
    { success: true; pointOfSale: PointOfSaleListItem } | { success: false; error: string }
  > {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`points-of-sale/${encodeURIComponent(id)}`), {
        method: "PUT",
        headers,
        body: JSON.stringify({
          name: body.name,
          branchId: body.branchId,
          storageId: body.storageId,
          deviceId: body.deviceId,
          isActive: body.isActive,
          priceLists: body.priceLists,
          defaultPriceListId: body.defaultPriceListId,
          kind: body.kind,
          acceptsPresaleTickets: body.acceptsPresaleTickets,
          allowsDeferredPayment: body.allowsDeferredPayment,
        }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        pointOfSale?: PointOfSaleListItem;
        error?: string;
      };
      if (!res.ok) {
        return { success: false, error: data.error || res.statusText };
      }
      if (data.success && data.pointOfSale) {
        return { success: true, pointOfSale: data.pointOfSale };
      }
      return { success: false, error: data.error || "No se pudo actualizar el punto de venta" };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al actualizar punto de venta";
      return { success: false, error: err };
    }
  }

  static async create(
    body: PointOfSaleWriteBody,
  ): Promise<{ success: true; pointOfSale: PointOfSaleListItem } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("points-of-sale"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: body.name,
          branchId: body.branchId,
          storageId: body.storageId,
          deviceId: body.deviceId,
          isActive: body.isActive,
          priceLists: body.priceLists,
          defaultPriceListId: body.defaultPriceListId,
          kind: body.kind,
          acceptsPresaleTickets: body.acceptsPresaleTickets,
          allowsDeferredPayment: body.allowsDeferredPayment,
        }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; pointOfSale?: PointOfSaleListItem; error?: string };
      if (!res.ok) {
        return { success: false, error: data.error || res.statusText };
      }
      if (data.success && data.pointOfSale) {
        return { success: true, pointOfSale: data.pointOfSale };
      }
      return { success: false, error: data.error || "No se pudo crear el punto de venta" };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al crear punto de venta";
      return { success: false, error: err };
    }
  }

  static async remove(id: string): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`points-of-sale/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        const t = await res.text();
        return { success: false, error: t || res.statusText };
      }
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (data.success) {
        return { success: true };
      }
      return { success: false, error: data.error || "No se pudo eliminar" };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al eliminar";
      return { success: false, error: err };
    }
  }
}
