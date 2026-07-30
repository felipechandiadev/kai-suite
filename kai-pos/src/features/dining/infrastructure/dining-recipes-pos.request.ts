import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  PosDiningRecipeLine,
  PosDiningRecipeSummary,
  PosDiningRecipesListResponse,
} from "../types/dining-recipe.types";

const BACKEND_CONNECTION_MESSAGE =
  "No se pudo conectar con el servidor. Comprueba que el backend esté en ejecución.";

async function backendFetch(url: string, init: RequestInit): Promise<Response | null> {
  try {
    return await fetch(url, { cache: "no-store", ...init });
  } catch {
    return null;
  }
}

async function authHeaders(): Promise<
  | { ok: true; headers: Record<string, string> }
  | { ok: false; message: string }
> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
  if (!token) return { ok: false, message: "No autenticado" };
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;
  return { ok: true, headers };
}

function parseMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const record = data as Record<string, unknown>;
  if (typeof record.message === "string" && record.message.trim()) return record.message;
  if (Array.isArray(record.message)) return record.message.map(String).join("; ");
  return fallback;
}

function mapLine(raw: Record<string, unknown>): PosDiningRecipeLine {
  return {
    id: String(raw.id ?? ""),
    inputVariantId: String(raw.inputVariantId ?? ""),
    qtyPerOutputUnit: Number(raw.qtyPerOutputUnit) || 0,
    wasteFactor: Number(raw.wasteFactor) || 0,
    sortOrder: Number(raw.sortOrder) || 1,
    inputProductName:
      typeof raw.inputProductName === "string" ? raw.inputProductName : null,
    inputSku: typeof raw.inputSku === "string" ? raw.inputSku : null,
    inputStockBaseUnitLabel:
      typeof raw.inputStockBaseUnitLabel === "string"
        ? raw.inputStockBaseUnitLabel
        : null,
  };
}

function mapRecipe(raw: Record<string, unknown>): PosDiningRecipeSummary {
  const linesRaw = Array.isArray(raw.lines) ? raw.lines : [];
  return {
    id: String(raw.id ?? ""),
    type: String(raw.type ?? ""),
    version: Number(raw.version) || 1,
    isActive: raw.isActive !== false,
    lines: linesRaw
      .filter((l): l is Record<string, unknown> => !!l && typeof l === "object")
      .map(mapLine)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

export class DiningRecipesPosRequest {
  static async listByOutputVariant(
    outputVariantId: string,
  ): Promise<PosDiningRecipesListResponse> {
    const base = process.env.BACKEND_API_URL;
    if (!base) return { success: false, message: "BACKEND_API_URL no está configurada" };
    const auth = await authHeaders();
    if (!auth.ok) return { success: false, message: auth.message };
    const vid = outputVariantId.trim();
    if (!vid) return { success: false, message: "Variante no indicada" };

    const qs = new URLSearchParams({ outputVariantId: vid });
    const res = await backendFetch(`${base}/api/recipes?${qs.toString()}`, {
      method: "GET",
      headers: auth.headers,
    });
    if (!res) return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { success: false, message: parseMessage(data, `HTTP ${res.status}`) };
    }
    if (!Array.isArray(data)) {
      return { success: false, message: "Respuesta inválida del servidor" };
    }
    return {
      success: true,
      recipes: data
        .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
        .map(mapRecipe),
    };
  }
}
