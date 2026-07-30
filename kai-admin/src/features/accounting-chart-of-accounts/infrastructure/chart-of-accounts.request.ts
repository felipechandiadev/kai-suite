import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { ChartOfAccountsHierarchy } from "../types/chart-of-accounts.types";
import type { CreateChartOfAccountPayload, CreateChartOfAccountResult } from "../types/chart-of-accounts.types";

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

function normalizeHierarchy(raw: unknown): ChartOfAccountsHierarchy {
  // Backend puede devolver directamente el array de nodos (roots),
  // o un objeto { hierarchy: [...] }.
  if (Array.isArray(raw)) {
    return { hierarchy: raw as any };
  }
  if (!raw || typeof raw !== "object") {
    return { hierarchy: [] };
  }
  const o = raw as Record<string, unknown>;
  const h = o.hierarchy;
  if (!Array.isArray(h)) {
    return { hierarchy: [] };
  }
  // The UI only needs shape; we trust backend for nested nodes.
  return { hierarchy: h as any };
}

export class ChartOfAccountsRequest {
  static async getHierarchy(includeInactive: boolean): Promise<{ success: true; data: ChartOfAccountsHierarchy } | { success: false; error: string; data: ChartOfAccountsHierarchy }> {
    const headers = await authHeaders();
    const q = new URLSearchParams();
    if (includeInactive) {
      q.set("includeInactive", "true");
    }
    try {
      const res = await fetch(apiUrl(`accounting/hierarchy${q.toString() ? `?${q}` : ""}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        const m = data.message;
        const msg = Array.isArray(m)
          ? m.map(String).join("; ")
          : typeof m === "string" && m.trim()
            ? m.trim()
            : res.statusText;
        return { success: false, error: msg, data: { hierarchy: [] } };
      }
      const json = (await res.json()) as unknown;
      return { success: true, data: normalizeHierarchy(json) };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al cargar plan de cuentas",
        data: { hierarchy: [] },
      };
    }
  }

  static async createAccount(payload: CreateChartOfAccountPayload): Promise<CreateChartOfAccountResult> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("accounting-accounts"), {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) {
        const m = json?.message;
        const msg =
          Array.isArray(m) ? m.map(String).join("; ") : typeof m === "string" && m.trim() ? m.trim() : res.statusText;
        return { success: false, error: msg || "No se pudo crear la cuenta" };
      }
      return { success: true, data: json?.data ?? null };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "No se pudo crear la cuenta" };
    }
  }
}

