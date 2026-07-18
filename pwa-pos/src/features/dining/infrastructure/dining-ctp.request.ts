import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";

const BACKEND_CONNECTION_MESSAGE =
  "No se pudo conectar con el servidor. Comprueba que el backend esté en ejecución.";

export type PosDiningCtpResult = {
  variantId: string;
  productionUnitId: string | null;
  inputStorageId: string | null;
  producibleQty: number | null;
};

export type PosDiningCtpDetailReason =
  | "NO_RECIPE"
  | "NO_ROUTING"
  | "NO_STORAGE"
  | "NO_LIMITING_LINES";

export type PosDiningCtpDetailLine = {
  inputVariantId: string;
  inputProductName: string | null;
  inputSku: string | null;
  inputStockBaseUnitLabel: string | null;
  consumptionPerUnit: number;
  available: number;
  lineCapacity: number | null;
  isBottleneck: boolean;
};

export type PosDiningCtpDetail = {
  variantId: string;
  branchId: string;
  productionUnitId: string | null;
  productionUnitName: string | null;
  inputStorageId: string | null;
  inputStorageName: string | null;
  producibleQty: number | null;
  reason: PosDiningCtpDetailReason | null;
  lines: PosDiningCtpDetailLine[];
};

export type PosDiningCtpBatchResponse =
  | { success: true; results: PosDiningCtpResult[] }
  | { success: false; message: string };

export type PosDiningCtpDetailResponse =
  | { success: true; detail: PosDiningCtpDetail }
  | { success: false; message: string };

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
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })
    ?.activeCompanyId;
  if (!token) return { ok: false, message: "No autenticado" };
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;
  return { ok: true, headers };
}

export class DiningCtpPosRequest {
  static async batch(input: {
    branchId: string;
    variantIds: string[];
  }): Promise<PosDiningCtpBatchResponse> {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      return { success: false, message: "BACKEND_API_URL no está configurada" };
    }
    const auth = await authHeaders();
    if (!auth.ok) return { success: false, message: auth.message };

    const items = input.variantIds
      .map((id) => id.trim())
      .filter(Boolean)
      .map((variantId) => ({ variantId }));

    if (items.length === 0) {
      return { success: true, results: [] };
    }

    const res = await backendFetch(`${base}/api/recipes/ctp/batch`, {
      method: "POST",
      headers: auth.headers,
      body: JSON.stringify({
        branchId: input.branchId.trim(),
        items,
      }),
    });
    if (!res) {
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

    const raw = data && typeof data === "object" ? (data as { results?: unknown }).results : null;
    const results: PosDiningCtpResult[] = [];
    if (Array.isArray(raw)) {
      for (const row of raw) {
        if (!row || typeof row !== "object") continue;
        const r = row as Record<string, unknown>;
        const variantId = String(r.variantId ?? "").trim();
        if (!variantId) continue;
        results.push({
          variantId,
          productionUnitId:
            r.productionUnitId != null ? String(r.productionUnitId) : null,
          inputStorageId:
            r.inputStorageId != null ? String(r.inputStorageId) : null,
          producibleQty:
            typeof r.producibleQty === "number"
              ? r.producibleQty
              : r.producibleQty != null && Number.isFinite(Number(r.producibleQty))
                ? Number(r.producibleQty)
                : null,
        });
      }
    }
    return { success: true, results };
  }

  static async detail(input: {
    branchId: string;
    variantId: string;
  }): Promise<PosDiningCtpDetailResponse> {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      return { success: false, message: "BACKEND_API_URL no está configurada" };
    }
    const auth = await authHeaders();
    if (!auth.ok) return { success: false, message: auth.message };

    const branchId = input.branchId.trim();
    const variantId = input.variantId.trim();
    if (!branchId || !variantId) {
      return { success: false, message: "Sucursal y variante son obligatorias" };
    }

    const qs = new URLSearchParams({ branchId, variantId });
    const res = await backendFetch(`${base}/api/recipes/ctp/detail?${qs.toString()}`, {
      method: "GET",
      headers: auth.headers,
    });
    if (!res) {
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

    const detail = parseCtpDetail(data);
    if (!detail) {
      return { success: false, message: "Respuesta CTP inválida" };
    }
    return { success: true, detail };
  }
}

function parseCtpDetailReason(raw: unknown): PosDiningCtpDetailReason | null {
  if (
    raw === "NO_RECIPE" ||
    raw === "NO_ROUTING" ||
    raw === "NO_STORAGE" ||
    raw === "NO_LIMITING_LINES"
  ) {
    return raw;
  }
  return null;
}

function parseCtpDetailLine(raw: unknown): PosDiningCtpDetailLine | null {
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

function parseCtpDetail(raw: unknown): PosDiningCtpDetail | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const variantId = String(o.variantId ?? "").trim();
  const branchId = String(o.branchId ?? "").trim();
  if (!variantId || !branchId) return null;
  const linesRaw = o.lines;
  const lines: PosDiningCtpDetailLine[] = Array.isArray(linesRaw)
    ? linesRaw.map(parseCtpDetailLine).filter((l): l is PosDiningCtpDetailLine => l != null)
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
    reason: parseCtpDetailReason(o.reason),
    lines,
  };
}
