import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) throw new Error("BACKEND_API_URL no está definida");
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function authHeaders(): Promise<
  | { ok: true; headers: Record<string, string> }
  | { ok: false; message: string }
> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })
    ?.activeCompanyId;
  if (!token) return { ok: false, message: "Sesión no válida" };
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (activeCompanyId) h["X-Active-Company-Id"] = activeCompanyId;
  return { ok: true, headers: h };
}

export type BoardDisplayRow = {
  id: string;
  companyId: string;
  branchId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
  token?: string;
};

export const DiningBoardDisplaysRequest = {
  async list(branchId?: string): Promise<
    | { success: true; rows: BoardDisplayRow[] }
    | { success: false; message: string }
  > {
    const auth = await authHeaders();
    if (!auth.ok) return { success: false, message: auth.message };
    const q = branchId?.trim()
      ? `?branchId=${encodeURIComponent(branchId.trim())}`
      : "";
    try {
      const res = await fetch(apiUrl(`/dining/board-displays${q}`), {
        headers: auth.headers,
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return {
          success: false,
          message:
            typeof data?.message === "string"
              ? data.message
              : `HTTP ${res.status}`,
        };
      }
      return {
        success: true,
        rows: Array.isArray(data) ? (data as BoardDisplayRow[]) : [],
      };
    } catch (e) {
      return {
        success: false,
        message: e instanceof Error ? e.message : "Error de red",
      };
    }
  },

  async create(input: {
    branchId: string;
    name: string;
  }): Promise<
    | { success: true; row: BoardDisplayRow }
    | { success: false; message: string }
  > {
    const auth = await authHeaders();
    if (!auth.ok) return { success: false, message: auth.message };
    try {
      const res = await fetch(apiUrl("/dining/board-displays"), {
        method: "POST",
        headers: auth.headers,
        body: JSON.stringify(input),
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return {
          success: false,
          message:
            typeof data?.message === "string"
              ? data.message
              : `HTTP ${res.status}`,
        };
      }
      return { success: true, row: data as BoardDisplayRow };
    } catch (e) {
      return {
        success: false,
        message: e instanceof Error ? e.message : "Error de red",
      };
    }
  },

  async revoke(
    id: string,
  ): Promise<{ success: true } | { success: false; message: string }> {
    const auth = await authHeaders();
    if (!auth.ok) return { success: false, message: auth.message };
    try {
      const res = await fetch(
        apiUrl(`/dining/board-displays/${encodeURIComponent(id)}`),
        {
          method: "DELETE",
          headers: auth.headers,
          cache: "no-store",
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        return {
          success: false,
          message:
            typeof data?.message === "string"
              ? data.message
              : `HTTP ${res.status}`,
        };
      }
      return { success: true };
    } catch (e) {
      return {
        success: false,
        message: e instanceof Error ? e.message : "Error de red",
      };
    }
  },
};
