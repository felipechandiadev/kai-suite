import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";

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

export type TreasuryBankMovementApiRow = Record<string, unknown>;

export class TreasuryBankMovementsRequest {
  /** Transacciones con `bankAccountKey` (movimientos de esa cuenta). */
  static async listByBankAccountKey(params: {
    bankAccountKey: string;
    page?: number;
    limit?: number;
  }): Promise<{ rows: TreasuryBankMovementApiRow[]; total: number; page: number; limit: number }> {
    const headers = await authHeaders();
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(200, Math.max(1, params.limit ?? 50));
    const q = new URLSearchParams();
    q.set("page", String(page));
    q.set("limit", String(limit));
    q.set("bankAccountKey", params.bankAccountKey.trim());

    const res = await fetch(apiUrl(`transactions?${q.toString()}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok) {
      const msg =
        typeof json?.message === "string"
          ? json.message
          : `Error ${res.status} al cargar movimientos`;
      throw new Error(msg);
    }
    const rawData = json?.data;
    const rows = Array.isArray(rawData) ? (rawData as TreasuryBankMovementApiRow[]) : [];
    const total =
      typeof json?.total === "number" && Number.isFinite(json.total) ? json.total : rows.length;
    const outPage =
      typeof json?.page === "number" && Number.isFinite(json.page) ? json.page : page;
    const outLimit =
      typeof json?.limit === "number" && Number.isFinite(json.limit) ? json.limit : limit;

    return { rows, total, page: outPage, limit: outLimit };
  }
}
