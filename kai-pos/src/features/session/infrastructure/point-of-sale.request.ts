import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { ListPointsOfSaleResult } from "../types/point-of-sale.types";

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) throw new Error("BACKEND_API_URL no está definida");
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function authHeaders(): Promise<HeadersInit> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = (session?.user as any)?.activeCompanyId as string | null | undefined;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  if (activeCompanyId) h["X-Active-Company-Id"] = activeCompanyId;
  return h;
}

export class PointOfSaleRequest {
  static async findById(
    id: string,
  ): Promise<
    | { success: true; pointOfSale: Record<string, unknown> }
    | { success: false; error: string }
  > {
    const headers = await authHeaders();
    const trimmed = id?.trim();
    if (!trimmed) {
      return { success: false, error: "Punto de venta no indicado" };
    }
    try {
      const res = await fetch(`${apiUrl(`points-of-sale/${encodeURIComponent(trimmed)}`)}`, {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        const t = await res.text();
        return { success: false, error: t || res.statusText };
      }
      const data = (await res.json()) as { success?: boolean; pointOfSale?: Record<string, unknown> };
      if (data?.success !== true || !data.pointOfSale) {
        return { success: false, error: "Punto de venta no encontrado" };
      }
      return { success: true, pointOfSale: data.pointOfSale };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al cargar el punto de venta";
      return { success: false, error: err };
    }
  }

  static async findAll(includeInactive = false): Promise<ListPointsOfSaleResult> {
    const headers = await authHeaders();
    const q = includeInactive ? "?includeInactive=true" : "?includeInactive=false";
    try {
      const res = await fetch(`${apiUrl("points-of-sale")}${q}`, { method: "GET", headers, cache: "no-store" });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        let message = res.statusText || `HTTP ${res.status}`;
        try {
          const parsed = t ? (JSON.parse(t) as { message?: string | string[] }) : null;
          if (parsed) {
            if (Array.isArray(parsed.message)) message = parsed.message.join(", ");
            else if (typeof parsed.message === "string" && parsed.message.trim()) {
              message = parsed.message.trim();
            }
          }
        } catch {
          if (t.trim()) message = t.trim();
        }
        return {
          success: false,
          error: message,
          pointsOfSale: [],
          statusCode: res.status,
        };
      }
      const data = (await res.json()) as { pointsOfSale?: any[] };
      return { success: true, pointsOfSale: Array.isArray(data?.pointsOfSale) ? (data.pointsOfSale as any) : [] };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al listar puntos de venta";
      return { success: false, error: err, pointsOfSale: [] };
    }
  }
}

