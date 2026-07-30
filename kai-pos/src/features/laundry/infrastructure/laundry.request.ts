import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  CreateLaundryReceptionInput,
  LaundryCatalogBundle,
  LaundryCatalogResponse,
  LaundryGarmentAttribute,
  LaundryGarmentType,
  LaundryCareTemplate,
  LaundryGarmentAttributeValueSnapshot,
  LaundryMutationResponse,
  LaundryPaymentMode,
  LaundryReception,
  LaundryReceptionDetailResponse,
  LaundryReceptionGarment,
  LaundryReceptionServiceLine,
  LaundryReceptionStatus,
  LaundryReceptionsListResponse,
} from "../types/laundry.types";

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
  if (typeof record.error === "string" && record.error.trim()) return record.error.trim();
  return fallback;
}

function readNumber(raw: unknown, fallback = 0): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function readBool(raw: unknown, fallback = true): boolean {
  if (typeof raw === "boolean") return raw;
  return fallback;
}

function normalizeServiceLine(raw: Record<string, unknown>): LaundryReceptionServiceLine {
  return {
    id: String(raw.id ?? ""),
    productVariantId: String(raw.productVariantId ?? ""),
    quantity: readNumber(raw.quantity),
    unitPrice: readNumber(raw.unitPrice),
    lineTotal: readNumber(raw.lineTotal),
    notes: typeof raw.notes === "string" ? raw.notes : null,
    sortOrder: readNumber(raw.sortOrder),
  };
}

function normalizeGarment(raw: Record<string, unknown>): LaundryReceptionGarment {
  const attributeValuesRaw = Array.isArray(raw.attributeValues) ? raw.attributeValues : [];
  const serviceLinesRaw = Array.isArray(raw.serviceLines) ? raw.serviceLines : [];
  return {
    id: String(raw.id ?? ""),
    garmentTypeId: String(raw.garmentTypeId ?? ""),
    quantity: readNumber(raw.quantity, 1),
    attributeValues: attributeValuesRaw
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const o = row as Record<string, unknown>;
        const attributeId = String(o.attributeId ?? "").trim();
        const valueId = String(o.valueId ?? "").trim();
        if (!attributeId || !valueId) return null;
        const snapshot: LaundryGarmentAttributeValueSnapshot = {
          attributeId,
          valueId,
        };
        if (o.attributeCode != null) snapshot.attributeCode = String(o.attributeCode);
        if (o.label != null) snapshot.label = String(o.label);
        return snapshot;
      })
      .filter((x): x is LaundryGarmentAttributeValueSnapshot => x != null),
    careInstructions: typeof raw.careInstructions === "string" ? raw.careInstructions : null,
    customerNotes: typeof raw.customerNotes === "string" ? raw.customerNotes : null,
    sortOrder: readNumber(raw.sortOrder),
    serviceLines: serviceLinesRaw.map((line) =>
      normalizeServiceLine(line as Record<string, unknown>),
    ),
  };
}

function normalizeReception(raw: Record<string, unknown>): LaundryReception {
  const garmentsRaw = Array.isArray(raw.garments) ? raw.garments : undefined;
  return {
    id: String(raw.id ?? ""),
    branchId: String(raw.branchId ?? ""),
    pointOfSaleId:
      raw.pointOfSaleId === null || raw.pointOfSaleId === undefined
        ? null
        : String(raw.pointOfSaleId),
    userId: String(raw.userId ?? ""),
    code: raw.code != null ? String(raw.code) : null,
    customerId: String(raw.customerId ?? ""),
    customerNameSnapshot: String(raw.customerNameSnapshot ?? "Cliente"),
    customerPhoneSnapshot:
      raw.customerPhoneSnapshot != null ? String(raw.customerPhoneSnapshot) : null,
    status: String(raw.status ?? "DRAFT") as LaundryReceptionStatus,
    paymentMode: String(raw.paymentMode ?? "FULL_ON_PICKUP") as LaundryPaymentMode,
    depositAmount: readNumber(raw.depositAmount),
    paidAmount: readNumber(raw.paidAmount),
    balanceDue: readNumber(raw.balanceDue),
    servicesTotal: readNumber(raw.servicesTotal),
    receivedAt: raw.receivedAt != null ? String(raw.receivedAt) : null,
    promisedAt: raw.promisedAt != null ? String(raw.promisedAt) : null,
    readyAt: raw.readyAt != null ? String(raw.readyAt) : null,
    deliveredAt: raw.deliveredAt != null ? String(raw.deliveredAt) : null,
    notes: typeof raw.notes === "string" ? raw.notes : null,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
    garments: garmentsRaw?.map((g) => normalizeGarment(g as Record<string, unknown>)),
  };
}

function normalizeGarmentType(raw: Record<string, unknown>): LaundryGarmentType | null {
  const id = String(raw.id ?? "").trim();
  const code = String(raw.code ?? "").trim();
  const name = String(raw.name ?? "").trim();
  if (!id || !code || !name) return null;
  return {
    id,
    code,
    name,
    active: readBool(raw.active),
    sortOrder: readNumber(raw.sortOrder),
  };
}

function normalizeAttributeValue(
  raw: Record<string, unknown>,
  attributeId?: string,
): import("../types/laundry.types").LaundryAttributeValue | null {
  const id = String(raw.id ?? "").trim();
  const label = String(raw.label ?? "").trim();
  const attrId = attributeId ?? String(raw.attributeId ?? "").trim();
  if (!id || !label || !attrId) return null;
  return {
    id,
    attributeId: attrId,
    label,
    active: readBool(raw.active),
    sortOrder: readNumber(raw.sortOrder),
  };
}

function normalizeGarmentAttribute(raw: Record<string, unknown>): LaundryGarmentAttribute | null {
  const id = String(raw.id ?? "").trim();
  const code = String(raw.code ?? "").trim();
  const name = String(raw.name ?? "").trim();
  if (!id || !code || !name) return null;
  const valuesRaw = Array.isArray(raw.values) ? raw.values : [];
  return {
    id,
    code,
    name,
    active: readBool(raw.active),
    sortOrder: readNumber(raw.sortOrder),
    values: valuesRaw
      .map((v) => normalizeAttributeValue(v as Record<string, unknown>, id))
      .filter((x): x is NonNullable<typeof x> => x != null),
  };
}

function normalizeCareTemplate(raw: Record<string, unknown>): LaundryCareTemplate | null {
  const id = String(raw.id ?? "").trim();
  const label = String(raw.label ?? "").trim();
  const text = String(raw.text ?? "").trim();
  if (!id || !label) return null;
  return {
    id,
    label,
    text,
    active: readBool(raw.active),
    sortOrder: readNumber(raw.sortOrder),
  };
}

export class LaundryRequest {
  private static async getBase(): Promise<
    | { ok: true; base: string; headers: Record<string, string> }
    | { ok: false; message: string }
  > {
    const base = process.env.BACKEND_API_URL;
    if (!base) return { ok: false, message: "BACKEND_API_URL no está configurada" };
    const auth = await authHeaders();
    if (!auth.ok) return { ok: false, message: auth.message };
    return { ok: true, base, headers: auth.headers };
  }

  static async listCatalog(): Promise<LaundryCatalogResponse> {
    const ctx = await LaundryRequest.getBase();
    if (!ctx.ok) return { success: false, message: ctx.message };

    const [typesRes, attrsRes, careRes] = await Promise.all([
      backendFetch(`${ctx.base}/api/laundry/catalog/types`, {
        method: "GET",
        headers: ctx.headers,
      }),
      backendFetch(`${ctx.base}/api/laundry/catalog/attributes`, {
        method: "GET",
        headers: ctx.headers,
      }),
      backendFetch(`${ctx.base}/api/laundry/catalog/care-templates`, {
        method: "GET",
        headers: ctx.headers,
      }),
    ]);

    if (!typesRes || !attrsRes || !careRes) {
      return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    }

    const typesData = await typesRes.json().catch(() => null);
    const attrsData = await attrsRes.json().catch(() => null);
    const careData = await careRes.json().catch(() => null);

    if (!typesRes.ok) {
      return { success: false, message: parseMessage(typesData, `HTTP ${typesRes.status}`) };
    }
    if (!attrsRes.ok) {
      return { success: false, message: parseMessage(attrsData, `HTTP ${attrsRes.status}`) };
    }
    if (!careRes.ok) {
      return { success: false, message: parseMessage(careData, `HTTP ${careRes.status}`) };
    }

    const garmentTypes = (Array.isArray((typesData as { items?: unknown[] })?.items)
      ? (typesData as { items: unknown[] }).items
      : []
    )
      .map((row) => normalizeGarmentType(row as Record<string, unknown>))
      .filter((x): x is LaundryGarmentType => x != null && x.active);

    const attributes = (Array.isArray((attrsData as { items?: unknown[] })?.items)
      ? (attrsData as { items: unknown[] }).items
      : []
    )
      .map((row) => normalizeGarmentAttribute(row as Record<string, unknown>))
      .filter((x): x is LaundryGarmentAttribute => x != null && x.active);

    const careTemplates = (Array.isArray((careData as { items?: unknown[] })?.items)
      ? (careData as { items: unknown[] }).items
      : []
    )
      .map((row) => normalizeCareTemplate(row as Record<string, unknown>))
      .filter((x): x is LaundryCareTemplate => x != null && x.active);

    const catalog: LaundryCatalogBundle = {
      garmentTypes: garmentTypes.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
      attributes: attributes.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
      careTemplates: careTemplates.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)),
    };

    return { success: true, catalog };
  }

  static async createReception(input: CreateLaundryReceptionInput): Promise<LaundryMutationResponse> {
    const ctx = await LaundryRequest.getBase();
    if (!ctx.ok) return { success: false, message: ctx.message };

    const res = await backendFetch(`${ctx.base}/api/laundry/receptions`, {
      method: "POST",
      headers: ctx.headers,
      body: JSON.stringify(input),
    });
    if (!res) return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { success: false, message: parseMessage(data, `HTTP ${res.status}`) };
    }
    const receptionRaw =
      data && typeof data === "object" && (data as { reception?: unknown }).reception != null
        ? (data as { reception: unknown }).reception
        : data;
    if (!receptionRaw || typeof receptionRaw !== "object") {
      return { success: false, message: "Respuesta inválida del servidor" };
    }
    return {
      success: true,
      reception: normalizeReception(receptionRaw as Record<string, unknown>),
    };
  }

  static async listReceptions(input: {
    branchId?: string;
    status?: LaundryReceptionStatus;
    code?: string;
    page?: number;
    limit?: number;
  }): Promise<LaundryReceptionsListResponse> {
    const ctx = await LaundryRequest.getBase();
    if (!ctx.ok) return { success: false, message: ctx.message };

    const qs = new URLSearchParams();
    if (input.branchId?.trim()) qs.set("branchId", input.branchId.trim());
    if (input.status) qs.set("status", input.status);
    if (input.code?.trim()) qs.set("code", input.code.trim());
    if (input.page != null) qs.set("page", String(input.page));
    if (input.limit != null) qs.set("limit", String(input.limit));

    const res = await backendFetch(`${ctx.base}/api/laundry/receptions?${qs.toString()}`, {
      method: "GET",
      headers: ctx.headers,
    });
    if (!res) return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { success: false, message: parseMessage(data, `HTTP ${res.status}`) };
    }
    if (!data || typeof data !== "object") {
      return { success: false, message: "Respuesta inválida del servidor" };
    }
    const row = data as Record<string, unknown>;
    const itemsRaw = Array.isArray(row.items) ? row.items : [];
    return {
      success: true,
      items: itemsRaw.map((item) => normalizeReception(item as Record<string, unknown>)),
      total: readNumber(row.total),
      page: Math.max(1, readNumber(row.page, 1)),
      limit: Math.max(1, readNumber(row.limit, 25)),
    };
  }

  static async getReception(id: string): Promise<LaundryReceptionDetailResponse> {
    const ctx = await LaundryRequest.getBase();
    if (!ctx.ok) return { success: false, message: ctx.message };
    const rid = id.trim();
    if (!rid) return { success: false, message: "Recepción no indicada" };

    const res = await backendFetch(`${ctx.base}/api/laundry/receptions/${encodeURIComponent(rid)}`, {
      method: "GET",
      headers: ctx.headers,
    });
    if (!res) return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { success: false, message: parseMessage(data, `HTTP ${res.status}`) };
    }
    const receptionRaw =
      data && typeof data === "object" && (data as { reception?: unknown }).reception != null
        ? (data as { reception: unknown }).reception
        : data;
    if (!receptionRaw || typeof receptionRaw !== "object") {
      return { success: false, message: "Respuesta inválida del servidor" };
    }
    return {
      success: true,
      reception: normalizeReception(receptionRaw as Record<string, unknown>),
    };
  }

  static async updateStatus(
    id: string,
    status: LaundryReceptionStatus,
  ): Promise<LaundryMutationResponse> {
    const ctx = await LaundryRequest.getBase();
    if (!ctx.ok) return { success: false, message: ctx.message };
    const rid = id.trim();
    if (!rid) return { success: false, message: "Recepción no indicada" };

    const res = await backendFetch(
      `${ctx.base}/api/laundry/receptions/${encodeURIComponent(rid)}/status`,
      {
        method: "PATCH",
        headers: ctx.headers,
        body: JSON.stringify({ status }),
      },
    );
    if (!res) return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { success: false, message: parseMessage(data, `HTTP ${res.status}`) };
    }
    const receptionRaw =
      data && typeof data === "object" && (data as { reception?: unknown }).reception != null
        ? (data as { reception: unknown }).reception
        : data;
    if (!receptionRaw || typeof receptionRaw !== "object") {
      return { success: false, message: "Respuesta inválida del servidor" };
    }
    return {
      success: true,
      reception: normalizeReception(receptionRaw as Record<string, unknown>),
    };
  }

  static async recordPayment(
    id: string,
    input: {
      paidAmount: number;
      saleTransactionId?: string;
      depositTransactionId?: string;
    },
  ): Promise<LaundryMutationResponse> {
    const ctx = await LaundryRequest.getBase();
    if (!ctx.ok) return { success: false, message: ctx.message };
    const rid = id.trim();
    if (!rid) return { success: false, message: "Recepción no indicada" };

    const res = await backendFetch(
      `${ctx.base}/api/laundry/receptions/${encodeURIComponent(rid)}/payment`,
      {
        method: "PATCH",
        headers: ctx.headers,
        body: JSON.stringify({
          paidAmount: Math.max(0, Math.round(Number(input.paidAmount) || 0)),
          saleTransactionId: input.saleTransactionId?.trim() || undefined,
          depositTransactionId: input.depositTransactionId?.trim() || undefined,
        }),
      },
    );
    if (!res) return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { success: false, message: parseMessage(data, `HTTP ${res.status}`) };
    }
    const receptionRaw =
      data && typeof data === "object" && (data as { reception?: unknown }).reception != null
        ? (data as { reception: unknown }).reception
        : data;
    if (!receptionRaw || typeof receptionRaw !== "object") {
      return { success: false, message: "Respuesta inválida del servidor" };
    }
    return {
      success: true,
      reception: normalizeReception(receptionRaw as Record<string, unknown>),
    };
  }
}
