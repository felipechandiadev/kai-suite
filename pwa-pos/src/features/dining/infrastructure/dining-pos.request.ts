import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  DiningOrderKind,
  PosDiningMenuGroup,
  PosDiningMenuSearchResponse,
  PosDiningMenuVariant,
  PosDiningMutationResponse,
  PosDiningOrderDetailResponse,
  PosDiningOrderLine,
  PosDiningOrderSummary,
  PosDiningOrdersListResponse,
  PosDiningRoomsListResponse,
} from "../types/dining-pos.types";

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

function mapLine(raw: Record<string, unknown>): PosDiningOrderLine {
  const fireNumberRaw = raw.kitchenFireNumber;
  const kitchenFireNumber =
    typeof fireNumberRaw === "number" && Number.isFinite(fireNumberRaw)
      ? fireNumberRaw
      : fireNumberRaw != null && String(fireNumberRaw).trim() !== ""
        ? Number(fireNumberRaw)
        : null;
  return {
    id: String(raw.id ?? ""),
    productVariantId: String(raw.productVariantId ?? ""),
    quantity: Number(raw.quantity) || 0,
    notes: typeof raw.notes === "string" ? raw.notes : null,
    kitchenStatus: String(raw.kitchenStatus ?? "DRAFT") as PosDiningOrderLine["kitchenStatus"],
    kitchenFireId:
      raw.kitchenFireId === null || raw.kitchenFireId === undefined
        ? null
        : String(raw.kitchenFireId),
    kitchenFireNumber:
      kitchenFireNumber != null && Number.isFinite(kitchenFireNumber)
        ? kitchenFireNumber
        : null,
  };
}

function mapOrder(raw: Record<string, unknown>): PosDiningOrderSummary {
  const diningTable =
    raw.diningTable && typeof raw.diningTable === "object"
      ? (raw.diningTable as Record<string, unknown>)
      : null;
  const diningRoom =
    raw.diningRoom && typeof raw.diningRoom === "object"
      ? (raw.diningRoom as Record<string, unknown>)
      : null;
  const linesRaw = Array.isArray(raw.lines) ? raw.lines : [];

  return {
    id: String(raw.id ?? ""),
    branchId: String(raw.branchId ?? ""),
    kind: String(raw.kind ?? "TABLE") as PosDiningOrderSummary["kind"],
    displayLabel: String(raw.displayLabel ?? "Cuenta"),
    status: String(raw.status ?? "OPEN") as PosDiningOrderSummary["status"],
    diningTableId:
      raw.diningTableId === null || raw.diningTableId === undefined
        ? null
        : String(raw.diningTableId),
    diningRoomId:
      raw.diningRoomId === null || raw.diningRoomId === undefined
        ? null
        : String(raw.diningRoomId),
    diningRoomName: diningRoom?.name != null ? String(diningRoom.name) : null,
    tableCode: diningTable?.code != null ? String(diningTable.code) : null,
    openedAt: String(raw.openedAt ?? new Date().toISOString()),
    profile:
      raw.profile && typeof raw.profile === "object"
        ? (raw.profile as PosDiningOrderSummary["profile"])
        : null,
    lines: linesRaw.map((line) => mapLine(line as Record<string, unknown>)),
  };
}

export class DiningPosRequest {
  static async listOrders(input: {
    branchId?: string;
    kind?: DiningOrderKind;
  }): Promise<PosDiningOrdersListResponse> {
    const base = process.env.BACKEND_API_URL;
    if (!base) return { success: false, message: "BACKEND_API_URL no está configurada" };
    const auth = await authHeaders();
    if (!auth.ok) return { success: false, message: auth.message };

    const qs = new URLSearchParams();
    if (input.branchId?.trim()) qs.set("branchId", input.branchId.trim());
    if (input.kind) qs.set("kind", input.kind);

    const res = await backendFetch(`${base}/api/dining/orders?${qs.toString()}`, {
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
      orders: data.map((row) => mapOrder(row as Record<string, unknown>)),
    };
  }

  static async getOrder(orderId: string): Promise<PosDiningOrderDetailResponse> {
    const base = process.env.BACKEND_API_URL;
    if (!base) return { success: false, message: "BACKEND_API_URL no está configurada" };
    const auth = await authHeaders();
    if (!auth.ok) return { success: false, message: auth.message };
    const id = orderId.trim();
    if (!id) return { success: false, message: "Cuenta no especificada" };

    const res = await backendFetch(`${base}/api/dining/orders/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: auth.headers,
    });
    if (!res) return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { success: false, message: parseMessage(data, `HTTP ${res.status}`) };
    }
    if (!data || typeof data !== "object") {
      return { success: false, message: "Respuesta inválida del servidor" };
    }
    return { success: true, order: mapOrder(data as Record<string, unknown>) };
  }

  static async listRooms(branchId?: string): Promise<PosDiningRoomsListResponse> {
    const base = process.env.BACKEND_API_URL;
    if (!base) return { success: false, message: "BACKEND_API_URL no está configurada" };
    const auth = await authHeaders();
    if (!auth.ok) return { success: false, message: auth.message };

    const qs = new URLSearchParams();
    if (branchId?.trim()) qs.set("branchId", branchId.trim());

    const res = await backendFetch(`${base}/api/dining/rooms?${qs.toString()}`, {
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
      rooms: data.map((row) => {
        const r = row as Record<string, unknown>;
        const tables = Array.isArray(r.tables)
          ? r.tables.map((t) => {
              const table = t as Record<string, unknown>;
              return {
                id: String(table.id ?? ""),
                code: String(table.code ?? ""),
                label: String(table.label ?? table.code ?? ""),
              };
            })
          : [];
        return {
          id: String(r.id ?? ""),
          name: String(r.name ?? ""),
          branchId: String(r.branchId ?? ""),
          isActive: r.isActive !== false,
          tables,
        };
      }),
    };
  }

  static async getBranchSettings(
    branchId: string,
  ): Promise<
    | { success: true; settings: import("../types/dining-pos.types").PosDiningBranchSettings }
    | { success: false; message: string }
  > {
    const base = process.env.BACKEND_API_URL;
    if (!base) return { success: false, message: "BACKEND_API_URL no está configurada" };
    const auth = await authHeaders();
    if (!auth.ok) return { success: false, message: auth.message };
    const bid = branchId.trim();
    if (!bid) return { success: false, message: "Sucursal no configurada en el POS" };

    const res = await backendFetch(
      `${base}/api/dining/branches/${encodeURIComponent(bid)}/numbering-settings`,
      { method: "GET", headers: auth.headers },
    );
    if (!res) return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { success: false, message: parseMessage(data, `HTTP ${res.status}`) };
    }
    if (!data || typeof data !== "object") {
      return { success: false, message: "Respuesta inválida del servidor" };
    }
    const row = data as Record<string, unknown>;
    const idsRaw = row.posAccountsMenuCategoryIds;
    const posAccountsMenuCategoryIds = Array.isArray(idsRaw)
      ? idsRaw.map((id) => String(id ?? "").trim()).filter(Boolean)
      : [];
    const catsRaw = row.posAccountsMenuCategories;
    const posAccountsMenuCategories = Array.isArray(catsRaw)
      ? catsRaw
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const o = item as Record<string, unknown>;
            const id = String(o.id ?? "").trim();
            const name = String(o.name ?? "").trim();
            if (!id || !name) return null;
            return { id, name };
          })
          .filter((x): x is { id: string; name: string } => x != null)
      : [];
    return {
      success: true,
      settings: {
        timezone: String(row.timezone ?? "America/Santiago"),
        resetTimeLocal: String(row.resetTimeLocal ?? "00:00:01"),
        allowWaiterOpenTable: row.allowWaiterOpenTable !== false,
        allowPosOpenTable: row.allowPosOpenTable === true,
        posAccountsMenuCategoryIds,
        posAccountsMenuCategories,
      },
    };
  }

  static async openTable(
    branchId: string,
    diningTableId: string,
  ): Promise<PosDiningMutationResponse> {
    const base = process.env.BACKEND_API_URL;
    if (!base) return { success: false, message: "BACKEND_API_URL no está configurada" };
    const auth = await authHeaders();
    if (!auth.ok) return { success: false, message: auth.message };
    const bid = branchId.trim();
    const tid = diningTableId.trim();
    if (!bid) return { success: false, message: "Sucursal no configurada en el POS" };
    if (!tid) return { success: false, message: "Mesa no indicada" };

    const res = await backendFetch(`${base}/api/dining/orders/open-table`, {
      method: "POST",
      headers: auth.headers,
      body: JSON.stringify({
        branchId: bid,
        diningTableId: tid,
        openedFrom: "POS",
      }),
    });
    if (!res) return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { success: false, message: parseMessage(data, `HTTP ${res.status}`) };
    }
    if (!data || typeof data !== "object") {
      return { success: false, message: "Respuesta inválida del servidor" };
    }
    return { success: true, order: mapOrder(data as Record<string, unknown>) };
  }

  static async openCounter(branchId: string): Promise<PosDiningMutationResponse> {
    return DiningPosRequest.openKindOrder("counter", branchId);
  }

  static async openTakeaway(branchId: string): Promise<PosDiningMutationResponse> {
    return DiningPosRequest.openKindOrder("takeaway", branchId);
  }

  private static async openKindOrder(
    kind: "counter" | "takeaway",
    branchId: string,
  ): Promise<PosDiningMutationResponse> {
    const base = process.env.BACKEND_API_URL;
    if (!base) return { success: false, message: "BACKEND_API_URL no está configurada" };
    const auth = await authHeaders();
    if (!auth.ok) return { success: false, message: auth.message };
    const bid = branchId.trim();
    if (!bid) return { success: false, message: "Sucursal no configurada en el POS" };

    const path =
      kind === "counter" ? "/api/dining/orders/open-counter" : "/api/dining/orders/open-takeaway";
    const res = await backendFetch(`${base}${path}`, {
      method: "POST",
      headers: auth.headers,
      body: JSON.stringify({ branchId: bid }),
    });
    if (!res) return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { success: false, message: parseMessage(data, `HTTP ${res.status}`) };
    }
    if (!data || typeof data !== "object") {
      return { success: false, message: "Respuesta inválida del servidor" };
    }
    return { success: true, order: mapOrder(data as Record<string, unknown>) };
  }

  static async transferCartLine(input: {
    diningOrderId: string;
    productVariantId: string;
    quantity: number;
    notes?: string;
  }): Promise<PosDiningMutationResponse> {
    const base = process.env.BACKEND_API_URL;
    if (!base) return { success: false, message: "BACKEND_API_URL no está configurada" };
    const auth = await authHeaders();
    if (!auth.ok) return { success: false, message: auth.message };

    const res = await backendFetch(`${base}/api/dining/orders/transfer-cart-line`, {
      method: "POST",
      headers: auth.headers,
      body: JSON.stringify(input),
    });
    if (!res) return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { success: false, message: parseMessage(data, `HTTP ${res.status}`) };
    }
    if (!data || typeof data !== "object") {
      return { success: false, message: "Respuesta inválida del servidor" };
    }
    return { success: true, order: mapOrder(data as Record<string, unknown>) };
  }

  static async addOrderItems(
    orderId: string,
    items: Array<{ productVariantId: string; quantity: number; notes?: string }>,
  ): Promise<PosDiningMutationResponse> {
    const base = process.env.BACKEND_API_URL;
    if (!base) return { success: false, message: "BACKEND_API_URL no está configurada" };
    const auth = await authHeaders();
    if (!auth.ok) return { success: false, message: auth.message };

    const res = await backendFetch(
      `${base}/api/dining/orders/${encodeURIComponent(orderId.trim())}/items`,
      {
        method: "POST",
        headers: auth.headers,
        body: JSON.stringify({ items }),
      },
    );
    if (!res) return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { success: false, message: parseMessage(data, `HTTP ${res.status}`) };
    }
    if (!data || typeof data !== "object") {
      return { success: false, message: "Respuesta inválida del servidor" };
    }
    return { success: true, order: mapOrder(data as Record<string, unknown>) };
  }

  static async updateOrderProfile(
    orderId: string,
    input: { customerName?: string },
  ): Promise<PosDiningMutationResponse> {
    const base = process.env.BACKEND_API_URL;
    if (!base) return { success: false, message: "BACKEND_API_URL no está configurada" };
    const auth = await authHeaders();
    if (!auth.ok) return { success: false, message: auth.message };
    const id = orderId.trim();
    if (!id) return { success: false, message: "Cuenta no indicada" };

    const res = await backendFetch(
      `${base}/api/dining/orders/${encodeURIComponent(id)}/profile`,
      {
        method: "PATCH",
        headers: auth.headers,
        body: JSON.stringify({ customerName: input.customerName }),
      },
    );
    if (!res) return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { success: false, message: parseMessage(data, `HTTP ${res.status}`) };
    }
    if (!data || typeof data !== "object") {
      return { success: false, message: "Respuesta inválida del servidor" };
    }
    return { success: true, order: mapOrder(data as Record<string, unknown>) };
  }

  static async updateOrderLineNotes(
    orderId: string,
    lineId: string,
    notes: string | null,
  ): Promise<PosDiningMutationResponse> {
    const base = process.env.BACKEND_API_URL;
    if (!base) return { success: false, message: "BACKEND_API_URL no está configurada" };
    const auth = await authHeaders();
    if (!auth.ok) return { success: false, message: auth.message };
    const oid = orderId.trim();
    const lid = lineId.trim();
    if (!oid || !lid) return { success: false, message: "Línea no indicada" };

    const res = await backendFetch(
      `${base}/api/dining/orders/${encodeURIComponent(oid)}/lines/${encodeURIComponent(lid)}`,
      {
        method: "PATCH",
        headers: auth.headers,
        body: JSON.stringify({ notes }),
      },
    );
    if (!res) return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { success: false, message: parseMessage(data, `HTTP ${res.status}`) };
    }
    if (!data || typeof data !== "object") {
      return { success: false, message: "Respuesta inválida del servidor" };
    }
    return { success: true, order: mapOrder(data as Record<string, unknown>) };
  }

  static async sendToKitchen(
    orderId: string,
    lineIds?: string[],
  ): Promise<PosDiningMutationResponse> {
    const base = process.env.BACKEND_API_URL;
    if (!base) return { success: false, message: "BACKEND_API_URL no está configurada" };
    const auth = await authHeaders();
    if (!auth.ok) return { success: false, message: auth.message };

    const ids = (lineIds ?? []).map((id) => id.trim()).filter(Boolean);
    const res = await backendFetch(
      `${base}/api/dining/orders/${encodeURIComponent(orderId.trim())}/send-to-kitchen`,
      {
        method: "POST",
        headers: auth.headers,
        body: JSON.stringify(ids.length > 0 ? { lineIds: ids } : {}),
      },
    );
    if (!res) return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { success: false, message: parseMessage(data, `HTTP ${res.status}`) };
    }
    if (!data || typeof data !== "object") {
      return { success: false, message: "Respuesta inválida del servidor" };
    }
    return { success: true, order: mapOrder(data as Record<string, unknown>) };
  }

  static async cancelOrderItem(
    orderId: string,
    lineId: string,
  ): Promise<PosDiningMutationResponse> {
    const base = process.env.BACKEND_API_URL;
    if (!base) return { success: false, message: "BACKEND_API_URL no está configurada" };
    const auth = await authHeaders();
    if (!auth.ok) return { success: false, message: auth.message };
    const oid = orderId.trim();
    const lid = lineId.trim();
    if (!oid || !lid) return { success: false, message: "Ítem no indicado" };

    const res = await backendFetch(
      `${base}/api/dining/orders/${encodeURIComponent(oid)}/items/${encodeURIComponent(lid)}/cancel`,
      { method: "POST", headers: auth.headers },
    );
    if (!res) return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { success: false, message: parseMessage(data, `HTTP ${res.status}`) };
    }
    if (!data || typeof data !== "object") {
      return { success: false, message: "Respuesta inválida del servidor" };
    }
    return { success: true, order: mapOrder(data as Record<string, unknown>) };
  }

  static async requestBill(orderId: string): Promise<PosDiningMutationResponse> {
    const base = process.env.BACKEND_API_URL;
    if (!base) return { success: false, message: "BACKEND_API_URL no está configurada" };
    const auth = await authHeaders();
    if (!auth.ok) return { success: false, message: auth.message };

    const res = await backendFetch(
      `${base}/api/dining/orders/${encodeURIComponent(orderId.trim())}/request-bill`,
      { method: "POST", headers: auth.headers },
    );
    if (!res) return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { success: false, message: parseMessage(data, `HTTP ${res.status}`) };
    }
    if (!data || typeof data !== "object") {
      return { success: false, message: "Respuesta inválida del servidor" };
    }
    return { success: true, order: mapOrder(data as Record<string, unknown>) };
  }

  static async closeOrder(
    orderId: string,
    linkedTransactionId?: string,
  ): Promise<PosDiningMutationResponse> {
    const base = process.env.BACKEND_API_URL;
    if (!base) return { success: false, message: "BACKEND_API_URL no está configurada" };
    const auth = await authHeaders();
    if (!auth.ok) return { success: false, message: auth.message };

    const res = await backendFetch(
      `${base}/api/dining/orders/${encodeURIComponent(orderId.trim())}/close`,
      {
        method: "POST",
        headers: auth.headers,
        body: JSON.stringify(
          linkedTransactionId?.trim() ? { linkedTransactionId: linkedTransactionId.trim() } : {},
        ),
      },
    );
    if (!res) return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { success: false, message: parseMessage(data, `HTTP ${res.status}`) };
    }
    if (!data || typeof data !== "object") {
      return { success: false, message: "Respuesta inválida del servidor" };
    }
    return { success: true, order: mapOrder(data as Record<string, unknown>) };
  }

  static async searchMenu(input: {
    query: string;
    group: PosDiningMenuGroup;
  }): Promise<PosDiningMenuSearchResponse> {
    const base = process.env.BACKEND_API_URL;
    if (!base) return { success: false, message: "BACKEND_API_URL no está configurada" };
    const auth = await authHeaders();
    if (!auth.ok) return { success: false, message: auth.message };

    const q = input.query.trim();
    if (q.length < 2) return { success: true, items: [] };

    const qs = new URLSearchParams({
      query: q,
      page: "1",
      pageSize: "24",
    });
    const res = await backendFetch(`${base}/api/products/search?${qs.toString()}`, {
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

    const allow =
      input.group === "preparados"
        ? new Set(["PREPARADO"])
        : new Set(["PHYSICAL", "ELABORADO", "MANUFACTURADO"]);

    const items: PosDiningMenuVariant[] = [];
    for (const row of data) {
      if (!row || typeof row !== "object") continue;
      const product = row as Record<string, unknown>;
      const productType = String(product.productType ?? "").toUpperCase();
      if (!allow.has(productType)) continue;
      const variants = Array.isArray(product.variants) ? product.variants : [];
      for (const v of variants) {
        if (!v || typeof v !== "object") continue;
        const variant = v as Record<string, unknown>;
        const variantId = String(variant.id ?? "").trim();
        if (!variantId) continue;
        items.push({
          variantId,
          productId: String(product.id ?? ""),
          productName: String(product.name ?? "Producto"),
          variantName: variant.name != null ? String(variant.name) : null,
          sku: variant.sku != null ? String(variant.sku) : null,
          productType,
        });
      }
    }
    return { success: true, items };
  }
}
