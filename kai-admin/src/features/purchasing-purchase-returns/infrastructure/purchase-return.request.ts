import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  CreatePurchaseReturnInput,
  PurchaseReturnListItem,
  PurchaseReturnListResult,
} from "../types/purchase-return.types";

function normalizeListItem(raw: unknown): PurchaseReturnListItem | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id.trim() : "";
  if (!id) {
    return null;
  }
  const createdAt =
    o.createdAt instanceof Date
      ? o.createdAt.toISOString()
      : typeof o.createdAt === "string"
        ? o.createdAt
        : "";
  const supplierRaw = o.supplier;
  let supplier: PurchaseReturnListItem["supplier"];
  if (supplierRaw && typeof supplierRaw === "object") {
    const s = supplierRaw as Record<string, unknown>;
    const personRaw = s.person;
    let person: NonNullable<PurchaseReturnListItem["supplier"]>["person"];
    if (personRaw && typeof personRaw === "object") {
      const p = personRaw as Record<string, unknown>;
      person = {
        businessName: typeof p.businessName === "string" ? p.businessName : undefined,
        firstName: typeof p.firstName === "string" ? p.firstName : undefined,
        lastName: typeof p.lastName === "string" ? p.lastName : undefined,
      };
    }
    supplier = {
      id: typeof s.id === "string" ? s.id : "",
      person,
    };
  }
  const metaRaw = o.metadata;
  let metadata: PurchaseReturnListItem["metadata"];
  if (metaRaw && typeof metaRaw === "object") {
    const m = metaRaw as Record<string, unknown>;
    const linksRaw = m.links;
    if (linksRaw && typeof linksRaw === "object") {
      const l = linksRaw as Record<string, unknown>;
      metadata = {
        links: {
          receptionId:
            typeof l.receptionId === "string" && l.receptionId.trim()
              ? l.receptionId.trim()
              : null,
          purchaseOrderId:
            typeof l.purchaseOrderId === "string" && l.purchaseOrderId.trim()
              ? l.purchaseOrderId.trim()
              : null,
          supplierInvoiceId:
            typeof l.supplierInvoiceId === "string" && l.supplierInvoiceId.trim()
              ? l.supplierInvoiceId.trim()
              : null,
        },
      };
    }
  }
  return {
    id,
    createdAt,
    documentNumber:
      typeof o.documentNumber === "string" && o.documentNumber.trim()
        ? o.documentNumber.trim()
        : null,
    status: typeof o.status === "string" ? o.status : undefined,
    subtotal: o.subtotal != null ? Number(o.subtotal) : undefined,
    taxAmount: o.taxAmount != null ? Number(o.taxAmount) : undefined,
    total: o.total != null ? Number(o.total) : undefined,
    supplier,
    externalReference:
      typeof o.externalReference === "string" && o.externalReference.trim()
        ? o.externalReference.trim()
        : null,
    notes: typeof o.notes === "string" && o.notes.trim() ? o.notes.trim() : null,
    metadata,
  };
}

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

export class PurchaseReturnRequest {
  static async list(opts: { page?: number; limit?: number; supplierId?: string; search?: string } = {}) {
    const params = new URLSearchParams();
    if (opts.page) params.set("page", String(opts.page));
    if (opts.limit) params.set("limit", String(opts.limit));
    if (opts.supplierId) params.set("supplierId", opts.supplierId);
    if (opts.search) params.set("search", opts.search);
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`purchase-returns?${params.toString()}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`No se pudo listar devoluciones (HTTP ${res.status})`);
    }
    const json = (await res.json()) as {
      data?: unknown[];
      total?: number;
      page?: number;
      limit?: number;
    };
    const data = (Array.isArray(json.data) ? json.data : [])
      .map(normalizeListItem)
      .filter((x): x is PurchaseReturnListItem => x != null);
    return {
      data,
      total: Number(json.total) || data.length,
      page: Number(json.page) || opts.page || 1,
      limit: Number(json.limit) || opts.limit || 25,
    };
  }

  static async create(input: CreatePurchaseReturnInput & { userId: string }): Promise<unknown> {
    const headers = await authHeaders();
    const res = await fetch(apiUrl("purchase-returns"), {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...input,
        metadata: { ...(input.metadata ?? {}), links: input.metadata?.links ?? {} },
      }),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(typeof data.message === "string" ? data.message : "No se pudo crear la devolución");
    }
    return data;
  }
}
