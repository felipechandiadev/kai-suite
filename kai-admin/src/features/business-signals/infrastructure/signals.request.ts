import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { SignalEvidenceDto, SignalsBoard } from "../types/signal.types";

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

export class SignalsRequest {
  static async getBoard(opts?: { branchId?: string }): Promise<SignalsBoard> {
    const params = new URLSearchParams();
    if (opts?.branchId) params.set("branchId", opts.branchId);
    const qs = params.toString();
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`signals/board${qs ? `?${qs}` : ""}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`No se pudo cargar el tablero de señales (HTTP ${res.status})`);
    }
    return (await res.json()) as SignalsBoard;
  }

  static async getEvidence(
    signalId: string,
    opts?: { branchId?: string },
  ): Promise<SignalEvidenceDto> {
    const params = new URLSearchParams();
    if (opts?.branchId) params.set("branchId", opts.branchId);
    const qs = params.toString();
    const headers = await authHeaders();
    const res = await fetch(
      apiUrl(`signals/${encodeURIComponent(signalId)}/evidence${qs ? `?${qs}` : ""}`),
      {
        method: "GET",
        headers,
        cache: "no-store",
      },
    );
    if (res.status === 404) {
      throw new Error("Señal no encontrada.");
    }
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(
        json.message || `No se pudo cargar la evidencia (HTTP ${res.status})`,
      );
    }
    return (await res.json()) as SignalEvidenceDto;
  }
}
