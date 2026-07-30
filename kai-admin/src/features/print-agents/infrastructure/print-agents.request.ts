import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { CreatePrintAgentResult, PrintAgentDto } from "../types/print-agent.types";

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) throw new Error("BACKEND_API_URL no está definida");
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function authHeaders(): Promise<HeadersInit> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  if (token == null || String(token).trim() === "") {
    throw new Error("Sesión no válida");
  }
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (activeCompanyId) h["X-Active-Company-Id"] = activeCompanyId;
  return h;
}

export class PrintAgentsRequest {
  static async list(branchId?: string): Promise<PrintAgentDto[]> {
    const q = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
    const res = await fetch(apiUrl(`/print-agents${q}`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`No se pudieron listar agentes (${res.status})`);
    }
    return (await res.json()) as PrintAgentDto[];
  }

  static async create(input: {
    displayName: string;
    branchId?: string;
  }): Promise<CreatePrintAgentResult> {
    const res = await fetch(apiUrl("/print-agents"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(t || `No se pudo crear agente (${res.status})`);
    }
    return (await res.json()) as CreatePrintAgentResult;
  }

  static async revoke(id: string): Promise<PrintAgentDto> {
    const res = await fetch(apiUrl(`/print-agents/${id}`), {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify({ revoke: true }),
    });
    if (!res.ok) {
      throw new Error(`No se pudo revocar agente (${res.status})`);
    }
    return (await res.json()) as PrintAgentDto;
  }
}
