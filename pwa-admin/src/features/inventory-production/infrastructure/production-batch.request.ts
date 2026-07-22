import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  CreateProductionBatchInput,
  ListProductionBatchesParams,
  ManufactureVariantSearchItem,
  ProductionBatchDetail,
  ProductionBatchListItem,
  ProductionOrderMetadata,
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

function readProductionOrder(
  meta: Record<string, unknown> | null,
): ProductionOrderMetadata | null {
  if (!meta || typeof meta !== "object") return null;
  const raw = meta.productionOrder;
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const lotsRaw = Array.isArray(o.lots) ? o.lots : [];
  return {
    productionUnitId: String(o.productionUnitId ?? ""),
    capacity:
      o.capacity == null || o.capacity === ""
        ? null
        : Number.isFinite(Number(o.capacity))
          ? Number(o.capacity)
          : null,
    plannedStartAt:
      typeof o.plannedStartAt === "string" && o.plannedStartAt.trim()
        ? o.plannedStartAt.trim()
        : null,
    plannedDeliveryAt:
      typeof o.plannedDeliveryAt === "string" && o.plannedDeliveryAt.trim()
        ? o.plannedDeliveryAt.trim()
        : null,
    lots: lotsRaw.map((row) => {
      const l = (row ?? {}) as Record<string, unknown>;
      const attrs = Array.isArray(l.attributes) ? l.attributes : [];
      return {
        lineKey: String(l.lineKey ?? ""),
        productVariantId: String(l.productVariantId ?? ""),
        quantity: Number(l.quantity ?? 0),
        notes: typeof l.notes === "string" ? l.notes : undefined,
        attributes: attrs.map((a) => {
          const x = (a ?? {}) as Record<string, unknown>;
          return {
            attributeId: String(x.attributeId ?? ""),
            optionId: String(x.optionId ?? ""),
            tagKey:
              x.tagKey == null || x.tagKey === "" ? null : String(x.tagKey),
            attributeName: String(x.attributeName ?? ""),
            optionLabel: String(x.optionLabel ?? ""),
          };
        }),
        lineCost:
          l.lineCost != null && Number.isFinite(Number(l.lineCost))
            ? Number(l.lineCost)
            : undefined,
        unitCost:
          l.unitCost != null && Number.isFinite(Number(l.unitCost))
            ? Number(l.unitCost)
            : undefined,
      };
    }),
  };
}

function mapListItem(raw: Record<string, unknown>): ProductionBatchListItem {
  const lines = Array.isArray(raw.lines) ? raw.lines : [];
  const first = (lines[0] ?? null) as Record<string, unknown> | null;
  const branch = raw.branch as Record<string, unknown> | undefined;
  const storage = (raw.storageEntry ?? raw.storage) as Record<string, unknown> | undefined;
  const meta = (raw.metadata ?? null) as Record<string, unknown> | null;
  const links = (meta?.links ?? null) as Record<string, unknown> | null;
  const lotCount =
    raw.lotCount != null && Number.isFinite(Number(raw.lotCount))
      ? Number(raw.lotCount)
      : lines.length;
  const totalQty = lines.reduce((sum, row) => {
    const l = row as Record<string, unknown>;
    return sum + (Number(l.quantity ?? 0) || 0);
  }, 0);
  const firstName = first?.productName != null ? String(first.productName) : null;
  const productSummary =
    lotCount > 1 && firstName
      ? `${firstName} (+${lotCount - 1})`
      : firstName;

  return {
    id: String(raw.id),
    documentNumber: raw.documentNumber != null ? String(raw.documentNumber) : null,
    status: String(raw.status ?? ""),
    branchId: raw.branchId != null ? String(raw.branchId) : null,
    branchName: branch?.name != null ? String(branch.name) : null,
    storageId: raw.storageId != null ? String(raw.storageId) : null,
    storageName: storage?.name != null ? String(storage.name) : null,
    outputStorageId:
      links?.outputStorageId != null ? String(links.outputStorageId) : null,
    productionUnitId:
      links?.productionUnitId != null ? String(links.productionUnitId) : null,
    createdAt: raw.createdAt != null ? String(raw.createdAt) : null,
    notes: raw.notes != null ? String(raw.notes) : null,
    outputProductName: productSummary,
    outputQuantity: lotCount > 0 ? totalQty : first?.quantity != null ? Number(first.quantity) : null,
    lotCount,
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
    productionOrder: readProductionOrder(meta),
    lines: lines.map((row) => {
      const l = row as Record<string, unknown>;
      return {
        id: String(l.id ?? ""),
        productVariantId: l.productVariantId != null ? String(l.productVariantId) : null,
        productName: l.productName != null ? String(l.productName) : null,
        quantity: Number(l.quantity ?? 0),
        unitPrice: Number(l.unitPrice ?? 0),
        total: Number(l.total ?? 0),
        notes: l.notes != null ? String(l.notes) : null,
      };
    }),
    unitCost: links?.unitCost != null ? Number(links.unitCost) : null,
    totalCost: links?.totalCost != null ? Number(links.totalCost) : null,
    materialsCost:
      links?.materialsCost != null ? Number(links.materialsCost) : null,
    laborCost: links?.laborCost != null ? Number(links.laborCost) : null,
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

  async searchManufactureVariants(params: {
    q: string;
    productionUnitId: string;
    limit?: number;
  }): Promise<ManufactureVariantSearchItem[]> {
    const q = new URLSearchParams();
    if (params.q.trim()) q.set("q", params.q.trim());
    q.set("productionUnitId", params.productionUnitId);
    if (params.limit) q.set("limit", String(params.limit));
    const res = await fetch(
      apiUrl(`/production-batches/manufacture-variants?${q.toString()}`),
      { headers: await authHeaders(), cache: "no-store" },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { items?: unknown[] };
    const items = Array.isArray(json.items) ? json.items : [];
    return items.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        variantId: String(r.variantId ?? ""),
        sku: String(r.sku ?? ""),
        productName: String(r.productName ?? ""),
        productType: String(r.productType ?? "MANUFACTURADO"),
        hasRecipe: r.hasRecipe === true,
        attributesCount: Number(r.attributesCount ?? 0) || 0,
      };
    });
  },

  async create(input: CreateProductionBatchInput & { userId: string }): Promise<ProductionBatchDetail> {
    const res = await fetch(apiUrl("/production-batches"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        branchId: input.branchId,
        userId: input.userId,
        storageId: input.storageId,
        outputStorageId: input.outputStorageId,
        productionUnitId: input.productionUnitId,
        capacity: input.capacity ?? null,
        plannedStartAt: input.plannedStartAt ?? null,
        plannedDeliveryAt: input.plannedDeliveryAt ?? null,
        notes: input.notes,
        lines: input.lots.map((lot) => ({
          lineKey: lot.lineKey,
          productVariantId: lot.productVariantId,
          productName: lot.productName,
          quantity: lot.quantity,
          notes: lot.notes,
          attributes: lot.attributes ?? [],
        })),
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
