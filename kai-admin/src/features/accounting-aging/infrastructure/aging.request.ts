import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { AgingKind, AgingReport } from "../types/aging.types";

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

export class AgingRequest {
  static async get(kind: AgingKind): Promise<AgingReport | null> {
    const path = kind === "receivable" ? "accounts-receivable/aging" : "accounts-payable/aging";
    try {
      const res = await fetch(apiUrl(path), {
        method: "GET",
        headers: await authHeaders(),
        cache: "no-store",
      });
      if (!res.ok) return null;
      return (await res.json()) as AgingReport;
    } catch {
      return null;
    }
  }
}
