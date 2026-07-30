import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  FiscalFolioSummary,
  PosFiscalPolicy,
  PosFolioAllocation,
  UpsertPosFolioAllocationInput,
} from "../types/pos-fiscal.types";

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) throw new Error("BACKEND_API_URL no está definida");
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function authHeaders(): Promise<HeadersInit> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  if (activeCompanyId) h["X-Active-Company-Id"] = activeCompanyId;
  return h;
}

function errorMessage(json: unknown, fallback: string): string {
  if (json && typeof json === "object") {
    const o = json as Record<string, unknown>;
    if (typeof o.message === "string") return o.message;
    if (Array.isArray(o.message)) return o.message.join(", ");
  }
  return fallback;
}

export class PosFiscalRequest {
  static async getPolicy(
    posId: string,
  ): Promise<{ success: true; policy: PosFiscalPolicy } | { success: false; error: string }> {
    try {
      const res = await fetch(apiUrl(`points-of-sale/${encodeURIComponent(posId)}/fiscal/policy`), {
        method: "GET",
        headers: await authHeaders(),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        policy?: PosFiscalPolicy;
        message?: string;
      };
      if (!res.ok || !data.success || !data.policy) {
        return { success: false, error: data.message ?? "No se pudo cargar política fiscal" };
      }
      return { success: true, policy: data.policy };
    } catch {
      return { success: false, error: "Error de red al cargar política fiscal" };
    }
  }

  static async replacePolicy(
    posId: string,
    policy: PosFiscalPolicy,
  ): Promise<{ success: true; policy: PosFiscalPolicy } | { success: false; error: string }> {
    try {
      const res = await fetch(apiUrl(`points-of-sale/${encodeURIComponent(posId)}/fiscal/policy`), {
        method: "PUT",
        headers: await authHeaders(),
        body: JSON.stringify({ policy }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        policy?: PosFiscalPolicy;
        message?: string;
      };
      if (!res.ok || !data.success || !data.policy) {
        return {
          success: false,
          error: errorMessage(data, "No se pudo guardar política fiscal"),
        };
      }
      return { success: true, policy: data.policy };
    } catch {
      return { success: false, error: "Error de red al guardar política fiscal" };
    }
  }

  static async listAllocations(
    posId: string,
  ): Promise<
    { success: true; allocations: PosFolioAllocation[] } | { success: false; error: string }
  > {
    try {
      const res = await fetch(
        apiUrl(`points-of-sale/${encodeURIComponent(posId)}/fiscal/folio-allocations`),
        { method: "GET", headers: await authHeaders(), cache: "no-store" },
      );
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        allocations?: PosFolioAllocation[];
        message?: string;
      };
      if (!res.ok || !data.success || !Array.isArray(data.allocations)) {
        return { success: false, error: data.message ?? "No se pudieron cargar asignaciones" };
      }
      return { success: true, allocations: data.allocations };
    } catch {
      return { success: false, error: "Error de red al cargar asignaciones" };
    }
  }

  static async replaceAllocations(
    posId: string,
    allocations: UpsertPosFolioAllocationInput[],
  ): Promise<
    { success: true; allocations: PosFolioAllocation[] } | { success: false; error: string }
  > {
    try {
      const res = await fetch(
        apiUrl(`points-of-sale/${encodeURIComponent(posId)}/fiscal/folio-allocations`),
        {
          method: "PUT",
          headers: await authHeaders(),
          body: JSON.stringify({ allocations }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        allocations?: PosFolioAllocation[];
        message?: string;
      };
      if (!res.ok || !data.success || !Array.isArray(data.allocations)) {
        return {
          success: false,
          error: errorMessage(data, "No se pudieron guardar asignaciones"),
        };
      }
      return { success: true, allocations: data.allocations };
    } catch {
      return { success: false, error: "Error de red al guardar asignaciones" };
    }
  }

  static async getFolioSummary(): Promise<
    { success: true; summaries: FiscalFolioSummary[] } | { success: false; error: string }
  > {
    try {
      const res = await fetch(apiUrl("company/fiscal/folio-summary"), {
        method: "GET",
        headers: await authHeaders(),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        summaries?: FiscalFolioSummary[];
        message?: string;
      };
      if (!res.ok || !data.success || !Array.isArray(data.summaries)) {
        return { success: false, error: data.message ?? "No se pudo cargar resumen de folios" };
      }
      return { success: true, summaries: data.summaries };
    } catch {
      return { success: false, error: "Error de red al cargar resumen de folios" };
    }
  }
}
