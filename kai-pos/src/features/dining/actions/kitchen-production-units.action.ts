"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";

export type PosKitchenProductionUnitDto = {
  id: string;
  name: string;
  code: string;
  kitchenFulfillmentMode: "KDS" | "PRINTED" | "BOTH";
  kitchenPrintSettings: {
    printAgentId?: string | null;
    printerDisplayLabel?: string | null;
  } | null;
};

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) throw new Error("BACKEND_API_URL no está definida");
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

function mapMode(raw: unknown): "KDS" | "PRINTED" | "BOTH" {
  if (raw === "PRINTED") return "PRINTED";
  if (raw === "BOTH") return "BOTH";
  return "KDS";
}

export async function listPosKitchenProductionUnitsAction(body?: {
  branchId?: string | null;
}): Promise<PosKitchenProductionUnitDto[]> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  if (!token) return [];
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })
    ?.activeCompanyId;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;

  const qs = new URLSearchParams();
  qs.set("purpose", "KITCHEN");
  qs.set("includeInactive", "false");
  if (body?.branchId?.trim()) qs.set("branchId", body.branchId.trim());

  const res = await fetch(apiUrl(`/production-units?${qs.toString()}`), {
    headers,
    cache: "no-store",
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as Array<Record<string, unknown>>;
  return rows.map((raw) => {
    const rawPrint = raw.kitchenPrintSettings;
    let kitchenPrintSettings: PosKitchenProductionUnitDto["kitchenPrintSettings"] =
      null;
    if (rawPrint && typeof rawPrint === "object" && !Array.isArray(rawPrint)) {
      const o = rawPrint as Record<string, unknown>;
      kitchenPrintSettings = {
        printAgentId:
          o.printAgentId != null && String(o.printAgentId).trim()
            ? String(o.printAgentId).trim()
            : null,
        printerDisplayLabel:
          o.printerDisplayLabel != null && String(o.printerDisplayLabel).trim()
            ? String(o.printerDisplayLabel).trim()
            : null,
      };
    }
    return {
      id: String(raw.id),
      name: String(raw.name ?? ""),
      code: String(raw.code ?? ""),
      kitchenFulfillmentMode: mapMode(raw.kitchenFulfillmentMode),
      kitchenPrintSettings,
    };
  });
}
