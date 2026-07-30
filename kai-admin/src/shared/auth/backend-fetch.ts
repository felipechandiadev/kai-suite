import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";

/**
 * Construye los headers para llamadas al backend, incluyendo:
 *  - Authorization: Bearer <userId>  (compat con esquema actual)
 *  - X-Active-Company-Id: <activeCompanyId>  (multi-company)
 */
export async function getBackendHeaders(): Promise<HeadersInit> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = session?.user?.activeCompanyId as
    | string
    | null
    | undefined;
  const multiCompanyMode = !!session?.user?.multiCompanyMode;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (multiCompanyMode) {
    headers["X-Multi-Company-Mode"] = "true";
  } else if (activeCompanyId) {
    headers["X-Active-Company-Id"] = activeCompanyId;
  }
  return headers;
}

export function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) {
    throw new Error("BACKEND_API_URL no está definida");
  }
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}
