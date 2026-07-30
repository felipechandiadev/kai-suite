import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";

export type SearchTransactionsListParams = {
  page: number;
  limit: number;
  /** Filtro `TransactionType` del API (ej. `PURCHASE_ORDER`). */
  type: string;
  search?: string;
  branchId?: string;
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

export class TransactionsSearchRequest {
  static async search(params: SearchTransactionsListParams): Promise<{
    rows: unknown[];
    total: number;
    page: number;
    limit: number;
  }> {
    const headers = await authHeaders();
    const q = new URLSearchParams();
    q.set("page", String(Math.max(1, params.page)));
    q.set("limit", String(Math.min(200, Math.max(1, params.limit))));
    q.set("type", params.type);
    const s = params.search?.trim();
    if (s) {
      q.set("search", s);
    }
    const b = params.branchId?.trim();
    if (b) {
      q.set("branchId", b);
    }

    try {
      const res = await fetch(apiUrl(`transactions?${q.toString()}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!res.ok) {
        throw new Error(
          typeof json?.message === "string"
            ? json.message
            : `Error ${res.status} al cargar transacciones`,
        );
      }
      const rawData = json?.data;
      const rows = Array.isArray(rawData) ? rawData : [];
      const total =
        typeof json?.total === "number" && Number.isFinite(json.total)
          ? json.total
          : rows.length;
      const page =
        typeof json?.page === "number" && Number.isFinite(json.page) ? json.page : params.page;
      const limit =
        typeof json?.limit === "number" && Number.isFinite(json.limit) ? json.limit : params.limit;

      return { rows, total, page, limit };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error de red";
      throw new Error(msg);
    }
  }
}
