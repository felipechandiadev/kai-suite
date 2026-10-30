import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { PurchaseSuggestionGroup } from "../types/purchase-suggestions.types";

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

export class PurchaseSuggestionsRequest {
  static async list(): Promise<PurchaseSuggestionGroup[]> {
    try {
      const res = await fetch(apiUrl("purchase-orders/suggestions"), {
        method: "GET",
        headers: await authHeaders(),
        cache: "no-store",
      });
      if (!res.ok) {
        return [];
      }
      const json = (await res.json().catch(() => null)) as unknown;
      return Array.isArray(json) ? (json as PurchaseSuggestionGroup[]) : [];
    } catch {
      return [];
    }
  }
}
