import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";

export type PackLineDto = {
  id?: string;
  inputVariantId: string;
  qtyPerOutputUnit: number;
  sortOrder?: number;
  inputSku?: string | null;
  inputProductName?: string | null;
};

export type PackCompositionDto = {
  id?: string;
  lines: PackLineDto[];
};

export type PackComponentSearchItem = {
  variantId: string;
  productName: string;
  sku: string;
};

export type PackComponentSearchResult = {
  items: PackComponentSearchItem[];
  page: number;
  pageSize: number;
  total: number;
};

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) throw new Error("BACKEND_API_URL no está definida");
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function authHeaders(): Promise<Record<string, string>> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
  if (!token) throw new Error("No autenticado");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;
  return headers;
}

function compositionFromUnknown(raw: unknown): PackCompositionDto {
  if (!raw || typeof raw !== "object") return { lines: [] };
  const data = raw as { id?: unknown; lines?: unknown };
  const linesRaw = Array.isArray(data.lines) ? data.lines : [];
  const lines: PackLineDto[] = linesRaw
    .map((line): PackLineDto | null => {
      if (!line || typeof line !== "object") return null;
      const l = line as Record<string, unknown>;
      const inputVariantId = l.inputVariantId != null ? String(l.inputVariantId) : "";
      if (!inputVariantId) return null;
      return {
        id: l.id != null ? String(l.id) : undefined,
        inputVariantId,
        qtyPerOutputUnit:
          typeof l.qtyPerOutputUnit === "number"
            ? l.qtyPerOutputUnit
            : Number(l.qtyPerOutputUnit) || 0,
        sortOrder: typeof l.sortOrder === "number" ? l.sortOrder : undefined,
        inputSku: l.inputSku != null ? String(l.inputSku) : null,
        inputProductName: l.inputProductName != null ? String(l.inputProductName) : null,
      };
    })
    .filter((line): line is PackLineDto => line != null);
  return {
    id: data.id != null ? String(data.id) : undefined,
    lines,
  };
}

function componentSearchFromUnknown(raw: unknown): PackComponentSearchResult {
  if (!raw || typeof raw !== "object") {
    return { items: [], page: 1, pageSize: 10, total: 0 };
  }
  const body = raw as Record<string, unknown>;
  const itemsRaw = Array.isArray(body.items) ? body.items : [];
  const items: PackComponentSearchItem[] = itemsRaw
    .map((row): PackComponentSearchItem | null => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const variantId = o.variantId != null ? String(o.variantId) : "";
      if (!variantId) return null;
      return {
        variantId,
        productName: o.productName != null ? String(o.productName) : "",
        sku: o.sku != null ? String(o.sku) : "",
      };
    })
    .filter((item): item is PackComponentSearchItem => item != null);
  const page =
    typeof body.page === "number" && Number.isFinite(body.page) ? body.page : 1;
  const pageSize =
    typeof body.pageSize === "number" && Number.isFinite(body.pageSize)
      ? body.pageSize
      : 10;
  const total =
    typeof body.total === "number" && Number.isFinite(body.total)
      ? Math.max(0, body.total)
      : items.length;
  return { items, page, pageSize, total };
}

export class PackRequest {
  static async searchComponents(params: {
    q: string;
    page?: number;
    pageSize?: number;
    excludeVariantId?: string;
  }): Promise<PackComponentSearchResult> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 10));
    const q = new URLSearchParams();
    const trimmed = params.q.trim();
    if (trimmed) q.set("q", trimmed);
    q.set("page", String(page));
    q.set("pageSize", String(pageSize));
    const exclude = params.excludeVariantId?.trim();
    if (exclude) q.set("excludeVariantId", exclude);
    try {
      const res = await fetch(apiUrl(`/packs/component-search?${q.toString()}`), {
        headers: await authHeaders(),
        cache: "no-store",
      });
      if (!res.ok) {
        return { items: [], page: 1, pageSize, total: 0 };
      }
      return componentSearchFromUnknown(await res.json());
    } catch {
      return { items: [], page: 1, pageSize, total: 0 };
    }
  }

  static async getComposition(variantId: string): Promise<PackCompositionDto> {
    const res = await fetch(apiUrl(`/packs/variants/${encodeURIComponent(variantId)}/composition`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`No se pudo cargar composición pack (${res.status})`);
    }
    return compositionFromUnknown(await res.json());
  }

  static async upsertComposition(
    variantId: string,
    lines: Array<{ inputVariantId: string; qtyPerOutputUnit: number; sortOrder?: number }>,
  ): Promise<PackCompositionDto> {
    const res = await fetch(apiUrl(`/packs/variants/${encodeURIComponent(variantId)}/composition`), {
      method: "PUT",
      headers: await authHeaders(),
      body: JSON.stringify({ lines }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : `Error ${res.status}`;
      throw new Error(msg);
    }
    return compositionFromUnknown(await res.json());
  }

  static async pmpSummary(variantId: string): Promise<{ packPmp: number; lineCount: number }> {
    const res = await fetch(apiUrl(`/packs/variants/${encodeURIComponent(variantId)}/pmp-summary`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      return { packPmp: 0, lineCount: 0 };
    }
    const data = (await res.json()) as { packPmp?: unknown; lineCount?: unknown };
    return {
      packPmp: Number(data.packPmp) || 0,
      lineCount: Number(data.lineCount) || 0,
    };
  }
}
