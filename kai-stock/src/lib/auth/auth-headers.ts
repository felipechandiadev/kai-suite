import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { getServerBackendApiBase } from "@/lib/backend-api-url";

export async function authHeaders(): Promise<HeadersInit> {
  const session = await getServerSession(authOptions);
  const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null } | undefined)
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

export function apiUrl(path: string): string {
  const base = getServerBackendApiBase();
  const p = path.startsWith("/") ? path.slice(1) : path;
  return `${base}/api/${p}`;
}
