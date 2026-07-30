import { getSession } from "next-auth/react";
import { getClientBackendApiBase } from "@/lib/backend-api-url";

export type BackendFetchResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; status: number; message: string; unreachable?: boolean };

export async function posOfflineBackendFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<BackendFetchResult<T>> {
  const base = getClientBackendApiBase();
  if (!base) {
    return { ok: false, status: 0, message: "BACKEND_API_URL no configurada", unreachable: true };
  }

  const session = await getSession();
  const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;
  const activeCompanyId = (session?.user as { activeCompanyId?: string } | undefined)
    ?.activeCompanyId;

  if (!token) {
    return { ok: false, status: 401, message: "No autenticado" };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (activeCompanyId) {
    headers["X-Active-Company-Id"] = activeCompanyId;
  }

  const url = `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

  try {
    const res = await fetch(url, { cache: "no-store", ...init, headers });
    const text = await res.text();
    let data: T;
    try {
      data = text ? (JSON.parse(text) as T) : ({} as T);
    } catch {
      return {
        ok: false,
        status: res.status,
        message: text || `HTTP ${res.status}`,
      };
    }
    if (!res.ok) {
      const message =
        (data as { message?: string })?.message?.trim() ||
        text ||
        `HTTP ${res.status}`;
      return { ok: false, status: res.status, message };
    }
    return { ok: true, data, status: res.status };
  } catch {
    return {
      ok: false,
      status: 0,
      message: "No se pudo conectar con el servidor",
      unreachable: true,
    };
  }
}

export async function posOfflineHealthCheck(): Promise<boolean> {
  const base = getClientBackendApiBase();
  if (!base) return false;
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/health`, {
      cache: "no-store",
      method: "GET",
    });
    return res.ok;
  } catch {
    return false;
  }
}
