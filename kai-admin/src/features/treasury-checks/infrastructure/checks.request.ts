import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  CheckDirection,
  CheckEventRow,
  CheckLinkRow,
  CheckRow,
  CheckStatus,
  CommittedOutgoingChecksSummary,
} from "../types/check.types";

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
  const activeCompanyId = (session?.user as any)?.activeCompanyId as
    | string
    | null
    | undefined;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  if (activeCompanyId) {
    h["X-Active-Company-Id"] = activeCompanyId;
  }
  return h;
}

export interface ListChecksParams {
  status?: CheckStatus[];
  direction?: CheckDirection;
  search?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  limit?: number;
  offset?: number;
}

export class ChecksRequest {
  static async getCommittedOutgoingSummary(): Promise<
    | { success: true; summary: CommittedOutgoingChecksSummary }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(apiUrl("checks/treasury/committed-outgoing"), {
        method: "GET",
        headers: await authHeaders(),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        summary?: CommittedOutgoingChecksSummary;
        message?: string;
      };
      if (!res.ok || !data?.summary) {
        return { success: false, error: data?.message || res.statusText };
      }
      return { success: true, summary: data.summary };
    } catch (e) {
      return {
        success: false,
        error:
          e instanceof Error ? e.message : "Error al cargar comprometidos",
      };
    }
  }

  static async list(
    params: ListChecksParams = {},
  ): Promise<
    | { success: true; items: CheckRow[]; total: number }
    | { success: false; error: string }
  > {
    try {
      const q = new URLSearchParams();
      if (params.status && params.status.length > 0) {
        for (const s of params.status) q.append("status", s);
      }
      if (params.direction) q.set("direction", params.direction);
      if (params.search) q.set("search", params.search);
      if (params.dueDateFrom) q.set("dueDateFrom", params.dueDateFrom);
      if (params.dueDateTo) q.set("dueDateTo", params.dueDateTo);
      if (params.limit != null) q.set("limit", String(params.limit));
      if (params.offset != null) q.set("offset", String(params.offset));
      const qs = q.toString();
      const res = await fetch(apiUrl(`checks${qs ? `?${qs}` : ""}`), {
        method: "GET",
        headers: await authHeaders(),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        items?: CheckRow[];
        total?: number;
        message?: string;
      };
      if (!res.ok) {
        return { success: false, error: data?.message || res.statusText };
      }
      return {
        success: true,
        items: Array.isArray(data?.items) ? data.items : [],
        total: typeof data?.total === "number" ? data.total : 0,
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al cargar cheques",
      };
    }
  }

  static async getById(
    id: string,
  ): Promise<
    | {
        success: true;
        check: CheckRow;
        events: CheckEventRow[];
        links: CheckLinkRow[];
      }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(apiUrl(`checks/${encodeURIComponent(id)}`), {
        method: "GET",
        headers: await authHeaders(),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        check?: CheckRow;
        events?: CheckEventRow[];
        links?: CheckLinkRow[];
        message?: string;
      };
      if (!res.ok || !data?.check) {
        return { success: false, error: data?.message || res.statusText };
      }
      return {
        success: true,
        check: data.check,
        events: Array.isArray(data.events) ? data.events : [],
        links: Array.isArray(data.links) ? data.links : [],
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al cargar cheque",
      };
    }
  }

  static async transition(
    id: string,
    action: "deposit" | "clear" | "bounce" | "void" | "endorse",
    body: Record<string, unknown>,
  ): Promise<
    | { success: true; check: CheckRow }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(
        apiUrl(`checks/${encodeURIComponent(id)}/${action}`),
        {
          method: "POST",
          headers: await authHeaders(),
          body: JSON.stringify(body),
          cache: "no-store",
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        check?: CheckRow;
        message?: string;
      };
      if (!res.ok || !data?.check) {
        return { success: false, error: data?.message || res.statusText };
      }
      return { success: true, check: data.check };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al actualizar cheque",
      };
    }
  }
}
