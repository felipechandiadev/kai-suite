import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  InventoryReportCatalogItem,
  InventoryReportRunResult,
} from "../types/inventory-report.types";

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
  if (token) h.Authorization = `Bearer ${token}`;
  if (activeCompanyId) h["X-Active-Company-Id"] = activeCompanyId;
  return h;
}

export class InventoryReportsRequest {
  static async listCatalog(): Promise<InventoryReportCatalogItem[]> {
    const headers = await authHeaders();
    const res = await fetch(apiUrl("inventory-reports"), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`No se pudo cargar el catálogo de reportes (HTTP ${res.status})`);
    }
    return (await res.json()) as InventoryReportCatalogItem[];
  }

  static async run(
    reportId: string,
    params: Record<string, unknown>,
  ): Promise<InventoryReportRunResult> {
    const headers = await authHeaders();
    const res = await fetch(
      apiUrl(`inventory-reports/${encodeURIComponent(reportId)}/run`),
      {
        method: "POST",
        headers,
        body: JSON.stringify({ params }),
        cache: "no-store",
      },
    );
    if (!res.ok) {
      let message = `No se pudo generar el reporte (HTTP ${res.status})`;
      try {
        const body = (await res.json()) as { message?: string | string[] };
        if (typeof body.message === "string") message = body.message;
        else if (Array.isArray(body.message)) message = body.message.join(", ");
      } catch {
        /* ignore */
      }
      throw new Error(message);
    }
    return (await res.json()) as InventoryReportRunResult;
  }
}
