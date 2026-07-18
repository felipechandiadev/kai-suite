import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { RecipeDto, RecipeLineDto, RecipeTypeDto } from "../types/recipe.types";

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

function parseRecipe(raw: unknown): RecipeDto | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  const outputVariantId = o.outputVariantId != null ? String(o.outputVariantId) : "";
  const type = o.type === "SERVICE" || o.type === "PRODUCTION" ? (o.type as RecipeTypeDto) : null;
  if (!id || !outputVariantId || !type) {
    return null;
  }
  const version = typeof o.version === "number" ? o.version : Number(o.version) || 1;
  const isActive = o.isActive !== false;
  const linesRaw = o.lines;
  const lines: RecipeLineDto[] | undefined = Array.isArray(linesRaw)
    ? linesRaw
        .map((line): RecipeLineDto | null => {
          if (!line || typeof line !== "object") {
            return null;
          }
          const l = line as Record<string, unknown>;
          const inputVariantId = l.inputVariantId != null ? String(l.inputVariantId) : "";
          const qty =
            typeof l.qtyPerOutputUnit === "number" ? l.qtyPerOutputUnit : Number(l.qtyPerOutputUnit) || 0;
          if (!inputVariantId) {
            return null;
          }
          return {
            id: l.id != null ? String(l.id) : undefined,
            inputVariantId,
            qtyPerOutputUnit: qty,
            wasteFactor:
              typeof l.wasteFactor === "number" ? l.wasteFactor : l.wasteFactor != null ? Number(l.wasteFactor) : 0,
            limitsProjectedStock:
              typeof l.limitsProjectedStock === "boolean"
                ? l.limitsProjectedStock
                : l.limitsProjectedStock == null
                  ? true
                  : Boolean(l.limitsProjectedStock),
            sortOrder: typeof l.sortOrder === "number" ? l.sortOrder : l.sortOrder != null ? Number(l.sortOrder) : undefined,
            inputProductName:
              l.inputProductName != null ? String(l.inputProductName) : undefined,
            inputSku: l.inputSku != null ? String(l.inputSku) : undefined,
            inputStockBaseUnitLabel:
              l.inputStockBaseUnitLabel != null ? String(l.inputStockBaseUnitLabel) : undefined,
          };
        })
        .filter((x): x is RecipeLineDto => x != null)
    : undefined;

  return { id, outputVariantId, type, version, isActive, lines };
}

export type CreateRecipePayload = {
  outputVariantId: string;
  type: RecipeTypeDto;
  version?: number;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
  lines: Array<{
    inputVariantId: string;
    qtyPerOutputUnit: number;
    wasteFactor?: number;
    limitsProjectedStock?: boolean;
    sortOrder?: number;
  }>;
};

export class RecipeRequest {
  static async list(outputVariantId?: string): Promise<RecipeDto[]> {
    const headers = await authHeaders();
    const q = new URLSearchParams();
    if (outputVariantId?.trim()) {
      q.set("outputVariantId", outputVariantId.trim());
    }
    const res = await fetch(apiUrl(`recipes?${q.toString()}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let msg = "No se pudo listar recetas";
      try {
        const data = text ? (JSON.parse(text) as any) : null;
        const m = data?.message;
        if (Array.isArray(m)) {
          msg = m.map(String).join("; ");
        } else if (typeof m === "string" && m.trim()) {
          msg = m;
        }
      } catch {
        // keep default
      }
      throw new Error(`${msg} (HTTP ${res.status})`);
    }
    const json = (await res.json()) as unknown;
    if (!Array.isArray(json)) {
      return [];
    }
    return json.map(parseRecipe).filter((x): x is RecipeDto => x != null);
  }

  static async create(payload: CreateRecipePayload): Promise<{ success: true; id: string } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("recipes"), {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const m = data.message;
        const msg = Array.isArray(m)
          ? m.map(String).join("; ")
          : typeof m === "string" && m.trim()
            ? m.trim()
            : res.statusText || "No se pudo crear la receta";
        return { success: false, error: msg };
      }
      const id = data.id != null ? String(data.id) : "";
      if (!id) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, id };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al crear la receta";
      return { success: false, error: err };
    }
  }

  static async update(
    recipeId: string,
    payload: CreateRecipePayload,
  ): Promise<{ success: true; id: string } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`recipes/${recipeId}`), {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const m = data.message;
        const msg = Array.isArray(m)
          ? m.map(String).join("; ")
          : typeof m === "string" && m.trim()
            ? m.trim()
            : res.statusText || "No se pudo actualizar la receta";
        return { success: false, error: msg };
      }
      const id = data.id != null ? String(data.id) : recipeId;
      return { success: true, id };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al actualizar la receta";
      return { success: false, error: err };
    }
  }
}
