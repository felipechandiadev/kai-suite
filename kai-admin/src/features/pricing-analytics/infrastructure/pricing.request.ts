import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  PricingApplyResult,
  PricingCalculateInput,
  PricingCalculateResult,
  PricingSnapshotDetail,
  PricingSnapshotSummary,
} from "../types/pricing.types";

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
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  if (activeCompanyId) {
    h["X-Active-Company-Id"] = activeCompanyId;
  }
  return h;
}

export class PricingRequest {
  static async calculate(input: PricingCalculateInput): Promise<PricingCalculateResult> {
    const headers = await authHeaders();
    const res = await fetch(apiUrl("pricing/calculate"), {
      method: "POST",
      headers,
      body: JSON.stringify(input),
      cache: "no-store",
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(json.message || `Error al calcular precios (HTTP ${res.status})`);
    }
    return (await res.json()) as PricingCalculateResult;
  }

  static async saveSnapshot(input: PricingCalculateInput): Promise<PricingSnapshotDetail> {
    const headers = await authHeaders();
    const res = await fetch(apiUrl("pricing/snapshots"), {
      method: "POST",
      headers,
      body: JSON.stringify(input),
      cache: "no-store",
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(json.message || `Error al guardar análisis (HTTP ${res.status})`);
    }
    return (await res.json()) as PricingSnapshotDetail;
  }

  static async listSnapshots(weekIso?: string): Promise<PricingSnapshotSummary[]> {
    const params = new URLSearchParams();
    if (weekIso) params.set("weekIso", weekIso);
    const qs = params.toString();
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`pricing/snapshots${qs ? `?${qs}` : ""}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`No se pudieron cargar snapshots (HTTP ${res.status})`);
    }
    return (await res.json()) as PricingSnapshotSummary[];
  }

  static async applySnapshot(snapshotId: string): Promise<PricingApplyResult> {
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`pricing/snapshots/${encodeURIComponent(snapshotId)}/apply`), {
      method: "POST",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(json.message || `Error al aplicar precios (HTTP ${res.status})`);
    }
    return (await res.json()) as PricingApplyResult;
  }
}
