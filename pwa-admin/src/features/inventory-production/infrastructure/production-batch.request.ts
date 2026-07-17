import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  CreateProductionBatchInput,
  ListProductionBatchesParams,
  ProductionBatchDetail,
  ProductionBatchListItem,
} from "../types/production-batch.types";

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) throw new Error("BACKEND_API_URL no está definida");
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function authHeaders(): Promise<HeadersInit> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = (session?.user as { activeCompanyId?: string } | undefined)
    ?.activeCompanyId;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  if (activeCompanyId) h["X-Active-Company-Id"] = activeCompanyId;
  return h;
}

function mapListItem(raw: Record<string, unknown>): ProductionBatchListItem {
  const lines = Array.isArray(raw.lines) ? raw.lines : [];
  const first = (lines[0] ?? null) as Record<string, unknown> | null;
  const branch = raw.branch as Record<string, unknown> | undefined;
  const storage = (raw.storageEntry ?? raw.storage) as Record<string, unknown> | undefined;
  return {
    id: String(raw.id),
    documentNumber: raw.documentNumber != null ? String(raw.documentNumber) : null,
    status: String(raw.status ?? ""),
    branchId: raw.branchId != null ? String(raw.branchId) : null,
    branchName: branch?.name != null ? String(branch.name) : null,
    storageId: raw.storageId != null ? String(raw.storageId) : null,
    storageName: storage?.name != null ? String(storage.name) : null,
    createdAt: raw.createdAt != null ? String(raw.createdAt) : null,
    notes: raw.notes != null ? String(raw.notes) : null,
    outputProductName: first?.productName != null ? String(first.productName) : null,
    outputQuantity: first?.quantity != null ? Number(first.quantity) : null,
  };
}

function mapDetail(raw: Record<string, unknown>): ProductionBatchDetail {
  const base = mapListItem(raw);
  const lines = Array.isArray(raw.lines) ? raw.lines : [];
  const meta = (raw.metadata ?? null) as Record<string, unknown> | null;
  const links = (meta?.links ?? null) as Record<string, unknown> | null;
  return {
    ...base,
    userId: raw.userId != null ? String(raw.userId) : null,
    metadata: meta,
    lines: lines.map((row) => {
      const l = row as Record<string, unknown>;
      return {
        id: String(l.id ?? ""),
        productVariantId: l.productVariantId != null ? String(l.productVariantId) : null,
        productName: l.productName != null ? String(l.productName) : null,
        quantity: Number(l.quantity ?? 0),
        unitPrice: Number(l.unitPrice ?? 0),
        total: Number(l.total ?? 0),
      };
    }),
    unitCost: links?.unitCost != null ? Number(links.unitCost) : null,
    totalCost: links?.totalCost != null ? Number(links.totalCost) : null,
  };
}

async function parseError(res: Response, fallback: string): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const json = JSON.parse(text) as { message?: string | string[] };
    if (typeof json.message === "string" && json.message.trim()) return json.message.trim();
    if (Array.isArray(json.message)) {
      return json.message.map(String).filter(Boolean).join(", ") || fallback;
    }
  } catch {
    if (text.trim()) return text.trim();
  }
  return `${fallback} (HTTP ${res.status})`;
}

export const ProductionBatchRequest = {
  async list(
    params: ListProductionBatchesParams = {},
  ): Promise<{ data: ProductionBatchListItem[]; total: number; page: number; limit: number }> {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    if (params.branchId) q.set("branchId", params.branchId);
    if (params.storageId) q.set("storageId", params.storageId);
    if (params.status) q.set("status", params.status);
    if (params.dateFrom) q.set("dateFrom", params.dateFrom);
    if (params.dateTo) q.set("dateTo", params.dateTo);
    const res = await fetch(apiUrl(`/production-batches?${q.toString()}`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      return { data: [], total: 0, page: 1, limit: 25 };
    }
    const json = (await res.json()) as {
      data?: unknown[];
      total?: number;
      page?: number;
      limit?: number;
    };
    const rows = Array.isArray(json.data) ? json.data : [];
    return {
      data: rows.map((r) => mapListItem(r as Record<string, unknown>)),
      total: Number(json.total ?? rows.length),
      page: Number(json.page ?? 1),
      limit: Number(json.limit ?? 25),
    };
  },

  async getById(id: string): Promise<ProductionBatchDetail | null> {
    const res = await fetch(apiUrl(`/production-batches/${id}`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return mapDetail((await res.json()) as Record<string, unknown>);
  },

  async create(input: CreateProductionBatchInput & { userId: string }): Promise<ProductionBatchDetail> {
    const res = await fetch(apiUrl("/production-batches"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        branchId: input.branchId,
        userId: input.userId,
        storageId: input.storageId,
        notes: input.notes,
        recipeId: input.recipeId,
        productionUnitId: input.productionUnitId,
        lines: [
          {
            productVariantId: input.productVariantId,
            quantity: input.quantity,
            productName: input.productName,
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(await parseError(res, "No se pudo crear la producción"));
    return mapDetail((await res.json()) as Record<string, unknown>);
  },

  async complete(id: string): Promise<unknown> {
    const res = await fetch(apiUrl(`/execution/production-batches/${id}/complete`), {
      method: "POST",
      headers: await authHeaders(),
      body: "{}",
    });
    if (!res.ok) throw new Error(await parseError(res, "No se pudo completar la producción"));
    return res.json().catch(() => ({}));
  },

  async cancel(id: string): Promise<ProductionBatchDetail> {
    const res = await fetch(apiUrl(`/production-batches/${id}/cancel`), {
      method: "POST",
      headers: await authHeaders(),
      body: "{}",
    });
    if (!res.ok) throw new Error(await parseError(res, "No se pudo cancelar la producción"));
    return mapDetail((await res.json()) as Record<string, unknown>);
  },
};
