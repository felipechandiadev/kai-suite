"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";

export type PosPrintAgentDto = {
  id: string;
  displayName: string;
  lanHost: string | null;
  wsPort: number | null;
  wssPort: number | null;
  useTls: boolean;
  online: boolean;
  platform: string;
  companyName?: string | null;
};

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) throw new Error("BACKEND_API_URL no está definida");
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

export async function listPrintAgentsForPosAction(): Promise<PosPrintAgentDto[]> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  if (!token) throw new Error("Sesión no válida");
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })
    ?.activeCompanyId;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;
  const res = await fetch(apiUrl("/print-agents"), {
    headers,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`No se pudieron listar agentes (${res.status})`);
  const rows = (await res.json()) as Array<Record<string, unknown>>;
  return rows.map((a) => ({
    id: String(a.id),
    displayName: String(a.displayName ?? ""),
    lanHost: a.lanHost != null ? String(a.lanHost) : null,
    wsPort: typeof a.wsPort === "number" ? a.wsPort : null,
    wssPort: typeof a.wssPort === "number" ? a.wssPort : null,
    useTls: Boolean(a.useTls),
    online: Boolean(a.online),
    platform: String(a.platform ?? "unknown"),
    companyName: a.companyName != null ? String(a.companyName) : null,
  }));
}
