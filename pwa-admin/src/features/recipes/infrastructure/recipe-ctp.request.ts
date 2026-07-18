import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  RecipeCtpDetail,
  RecipeCtpDetailLine,
  RecipeCtpDetailReason,
  RecipeCtpDetailResponse,
} from "../types/recipe-ctp.types";

const BACKEND_CONNECTION_MESSAGE =
  "No se pudo conectar con el servidor. Comprueba que el backend esté en ejecución.";

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
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  if (activeCompanyId) h["X-Active-Company-Id"] = activeCompanyId;
  return h;
}

function parseReason(raw: unknown): RecipeCtpDetailReason | null {
  if (raw === "NO_RECIPE" || raw === "NO_ROUTING" || raw === "NO_STORAGE" || raw === "NO_LIMITING_LINES") {
    return raw;
  }
  return null;
}

function parseLine(raw: unknown): RecipeCtpDetailLine | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const inputVariantId = String(o.inputVariantId ?? "").trim();
  if (!inputVariantId) return null;
  return {
    inputVariantId,
    inputProductName: o.inputProductName != null ? String(o.inputProductName) : null,
    inputSku: o.inputSku != null ? String(o.inputSku) : null,
    inputStockBaseUnitLabel:
      o.inputStockBaseUnitLabel != null ? String(o.inputStockBaseUnitLabel) : null,
    qtyPerOutputUnit: Number(o.qtyPerOutputUnit ?? 0),
    wasteFactor: Number(o.wasteFactor ?? 0),
    limitsProjectedStock: o.limitsProjectedStock !== false,
    trackInventory: o.trackInventory !== false,
    consumptionPerUnit: Number(o.consumptionPerUnit ?? 0),
    available: Number(o.available ?? 0),
    lineCapacity:
      o.lineCapacity == null
        ? null
        : Number.isFinite(Number(o.lineCapacity))
          ? Number(o.lineCapacity)
          : null,
    isBottleneck: o.isBottleneck === true,
  };
}

function parseDetail(raw: unknown): RecipeCtpDetail | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const variantId = String(o.variantId ?? "").trim();
  const branchId = String(o.branchId ?? "").trim();
  if (!variantId || !branchId) return null;
  const linesRaw = o.lines;
  const lines: RecipeCtpDetailLine[] = Array.isArray(linesRaw)
    ? linesRaw.map(parseLine).filter((l): l is RecipeCtpDetailLine => l != null)
    : [];
  return {
    variantId,
    branchId,
    productionUnitId: o.productionUnitId != null ? String(o.productionUnitId) : null,
    productionUnitName: o.productionUnitName != null ? String(o.productionUnitName) : null,
    inputStorageId: o.inputStorageId != null ? String(o.inputStorageId) : null,
    inputStorageName: o.inputStorageName != null ? String(o.inputStorageName) : null,
    producibleQty:
      o.producibleQty == null
        ? null
        : Number.isFinite(Number(o.producibleQty))
          ? Number(o.producibleQty)
          : null,
    reason: parseReason(o.reason),
    lines,
  };
}

export class RecipeCtpRequest {
  static async detail(input: {
    variantId: string;
    branchId: string;
  }): Promise<RecipeCtpDetailResponse> {
    const variantId = input.variantId.trim();
    const branchId = input.branchId.trim();
    if (!variantId || !branchId) {
      return { success: false, message: "Variante y sucursal son obligatorias" };
    }
    let res: Response;
    try {
      const qs = new URLSearchParams({ variantId, branchId });
      res = await fetch(`${apiUrl("/recipes/ctp/detail")}?${qs.toString()}`, {
        cache: "no-store",
        headers: await authHeaders(),
      });
    } catch {
      return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg =
        data && typeof data === "object" && typeof (data as { message?: unknown }).message === "string"
          ? String((data as { message: string }).message)
          : `HTTP ${res.status}`;
      return { success: false, message: msg };
    }
    const detail = parseDetail(data);
    if (!detail) {
      return { success: false, message: "Respuesta CTP inválida" };
    }
    return { success: true, detail };
  }
}
