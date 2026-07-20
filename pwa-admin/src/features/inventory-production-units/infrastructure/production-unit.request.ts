import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  CreateProductionUnitInput,
  ProductionUnitInventoryMode,
  ProductionUnitListItem,
  ProductionUnitPurpose,
  ProductionUnitScope,
  UpdateProductionUnitInput,
} from "../types/production-unit.types";

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) throw new Error("BACKEND_API_URL no está definida");
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function authHeaders(): Promise<HeadersInit> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = (session?.user as { activeCompanyId?: string })?.activeCompanyId;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  if (activeCompanyId) h["X-Active-Company-Id"] = activeCompanyId;
  return h;
}

function mapUnit(raw: Record<string, unknown>): ProductionUnitListItem {
  const scope: ProductionUnitScope =
    raw.scope === "COMPANY" ? "COMPANY" : "BRANCH";
  const inventoryMode: ProductionUnitInventoryMode =
    raw.inventoryMode === "AUTONOMOUS" ? "AUTONOMOUS" : "DEPENDENT";
  const purpose: ProductionUnitPurpose =
    raw.purpose === "BATCH" ? "BATCH" : "KITCHEN";
  return {
    id: String(raw.id),
    branchId: raw.branchId != null ? String(raw.branchId) : null,
    scope,
    inventoryMode,
    purpose,
    code: String(raw.code ?? ""),
    name: String(raw.name ?? ""),
    defaultInputStorageId:
      raw.defaultInputStorageId != null ? String(raw.defaultInputStorageId) : null,
    defaultOutputStorageId:
      raw.defaultOutputStorageId != null ? String(raw.defaultOutputStorageId) : null,
    laborUnitIds: Array.isArray(raw.laborUnitIds)
      ? raw.laborUnitIds.map((id) => String(id)).filter(Boolean)
      : [],
    isActive: raw.isActive !== false,
  };
}

export const ProductionUnitRequest = {
  async list(branchId?: string): Promise<ProductionUnitListItem[]> {
    const qs = new URLSearchParams();
    if (branchId) qs.set("branchId", branchId);
    qs.set("includeInactive", "true");
    const res = await fetch(apiUrl(`/production-units?${qs.toString()}`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((row) => mapUnit(row as Record<string, unknown>));
  },

  async create(input: CreateProductionUnitInput): Promise<ProductionUnitListItem | null> {
    const res = await fetch(apiUrl("/production-units"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let message = `No se pudo crear la unidad (HTTP ${res.status})`;
      try {
        const json = JSON.parse(text) as { message?: string | string[] };
        if (typeof json.message === "string" && json.message.trim()) {
          message = json.message.trim();
        } else if (Array.isArray(json.message)) {
          message = json.message.map(String).filter(Boolean).join(", ") || message;
        }
      } catch {
        if (text.trim()) message = text.trim();
      }
      throw new Error(message);
    }
    return mapUnit((await res.json()) as Record<string, unknown>);
  },

  async update(
    id: string,
    input: Omit<UpdateProductionUnitInput, "id">,
  ): Promise<ProductionUnitListItem | null> {
    const res = await fetch(apiUrl(`/production-units/${id}`), {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let message = `No se pudo actualizar la unidad (HTTP ${res.status})`;
      try {
        const json = JSON.parse(text) as { message?: string | string[] };
        if (typeof json.message === "string" && json.message.trim()) {
          message = json.message.trim();
        } else if (Array.isArray(json.message)) {
          message = json.message.map(String).filter(Boolean).join(", ") || message;
        }
      } catch {
        if (text.trim()) message = text.trim();
      }
      throw new Error(message);
    }
    return mapUnit((await res.json()) as Record<string, unknown>);
  },
};
