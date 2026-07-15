import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  DeliveryCommuneRow,
  DeliveryDriverRow,
  DeliveryOccurrenceRow,
  DeliveryOperationsBoard,
  DeliverySettingsRow,
  DeliveryZoneRow,
  GeoJsonPolygon,
} from "../types/delivery.types";

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) throw new Error("BACKEND_API_URL no está definida");
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

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  const text = await res.text().catch(() => "");
  if (!text) return fallback;
  try {
    const json = JSON.parse(text) as { message?: string | string[] };
    if (Array.isArray(json.message)) return json.message.join(", ");
    if (typeof json.message === "string" && json.message.trim()) return json.message;
  } catch {
    // plain text
  }
  return text;
}

export class DeliveryRequest {
  static async getSettings(): Promise<DeliverySettingsRow> {
    const res = await fetch(apiUrl("/delivery/admin/settings"), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async updateSettings(body: Partial<DeliverySettingsRow>) {
    const res = await fetch(apiUrl("/delivery/admin/settings"), {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async listCommunes(): Promise<DeliveryCommuneRow[]> {
    const res = await fetch(apiUrl("/delivery/admin/communes"), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async setCommuneEnabled(id: string, isEnabled: boolean) {
    const res = await fetch(apiUrl(`/delivery/admin/communes/${id}`), {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify({ isEnabled }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async listZones(): Promise<DeliveryZoneRow[]> {
    const res = await fetch(apiUrl("/delivery/admin/zones"), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async saveZone(body: {
    id?: string;
    name: string;
    shippingFee: number;
    isActive: boolean;
    communeCode?: string | null;
    geometry?: GeoJsonPolygon | null;
  }) {
    const res = await fetch(apiUrl("/delivery/admin/zones"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async listOccurrences(from?: string, to?: string): Promise<DeliveryOccurrenceRow[]> {
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    const res = await fetch(apiUrl(`/delivery/admin/calendar/occurrences?${qs}`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async createOccurrence(body: {
    name: string;
    kind?: "LOCAL_DELIVERY" | "PICKUP";
    occurrenceDate: string;
    departureTime: string;
    endTime?: string | null;
    orderCutoffTime: string;
    maxOrders?: number | null;
    driverUserId?: string | null;
    zoneIds?: string[];
  }): Promise<DeliveryOccurrenceRow> {
    const res = await fetch(apiUrl("/delivery/admin/calendar/occurrences"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, `HTTP ${res.status}`));
    }
    return res.json();
  }

  static async updateOccurrence(
    id: string,
    body: {
      name?: string;
      kind?: "LOCAL_DELIVERY" | "PICKUP";
      occurrenceDate?: string;
      departureTime?: string;
      endTime?: string | null;
      orderCutoffTime?: string;
      maxOrders?: number | null;
      driverUserId?: string | null;
      zoneIds?: string[];
      isCancelled?: boolean;
    },
  ): Promise<DeliveryOccurrenceRow> {
    const res = await fetch(apiUrl(`/delivery/admin/calendar/occurrences/${id}`), {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, `HTTP ${res.status}`));
    }
    return res.json();
  }

  static async cancelOccurrence(id: string): Promise<DeliveryOccurrenceRow> {
    const res = await fetch(apiUrl(`/delivery/admin/calendar/occurrences/${id}/cancel`), {
      method: "POST",
      headers: await authHeaders(),
    });
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, `HTTP ${res.status}`));
    }
    return res.json();
  }

  static async getOperationsBoard(params?: {
    date?: string;
    occurrenceId?: string | null;
    search?: string | null;
  }): Promise<DeliveryOperationsBoard> {
    const qs = new URLSearchParams();
    if (params?.date) qs.set("date", params.date);
    if (params?.occurrenceId) qs.set("occurrenceId", params.occurrenceId);
    if (params?.search?.trim()) qs.set("search", params.search.trim());
    const suffix = qs.toString() ? `?${qs}` : "";
    const res = await fetch(apiUrl(`/delivery/admin/operations${suffix}`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(await readErrorMessage(res, `HTTP ${res.status}`));
    return res.json();
  }

  static async listDrivers(): Promise<DeliveryDriverRow[]> {
    const res = await fetch(apiUrl("/delivery/admin/drivers"), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(await readErrorMessage(res, `HTTP ${res.status}`));
    return res.json();
  }

  static async updateOrderStatus(id: string, status: string) {
    const res = await fetch(apiUrl(`/delivery/admin/orders/${id}/status`), {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error(await readErrorMessage(res, `HTTP ${res.status}`));
    return res.json();
  }

  static async assignOccurrenceDriver(occurrenceId: string, driverUserId: string | null) {
    const res = await fetch(
      apiUrl(`/delivery/admin/calendar/occurrences/${occurrenceId}/driver`),
      {
        method: "PATCH",
        headers: await authHeaders(),
        body: JSON.stringify({ driverUserId }),
      },
    );
    if (!res.ok) throw new Error(await readErrorMessage(res, `HTTP ${res.status}`));
    return res.json();
  }

  static async optimizeOccurrenceRoute(occurrenceId: string) {
    const res = await fetch(
      apiUrl(`/delivery/admin/calendar/occurrences/${occurrenceId}/optimize-route`),
      {
        method: "POST",
        headers: await authHeaders(),
      },
    );
    if (!res.ok) throw new Error(await readErrorMessage(res, `HTTP ${res.status}`));
    return res.json();
  }

  static async startOccurrenceRoute(occurrenceId: string) {
    const res = await fetch(
      apiUrl(`/delivery/admin/calendar/occurrences/${occurrenceId}/start-route`),
      {
        method: "POST",
        headers: await authHeaders(),
      },
    );
    if (!res.ok) throw new Error(await readErrorMessage(res, `HTTP ${res.status}`));
    return res.json();
  }

  static async toggleOrderLinePicked(orderId: string, lineId: string, isPicked: boolean) {
    const res = await fetch(
      apiUrl(`/delivery/admin/orders/${orderId}/lines/${lineId}/picked`),
      {
        method: "PATCH",
        headers: await authHeaders(),
        body: JSON.stringify({ isPicked }),
      },
    );
    if (!res.ok) throw new Error(await readErrorMessage(res, `HTTP ${res.status}`));
    return res.json();
  }

  static async pickAllOrderLines(orderId: string, advanceTo?: string | null) {
    const res = await fetch(
      apiUrl(`/delivery/admin/orders/${orderId}/pick-all-lines`),
      {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ advanceTo: advanceTo ?? null }),
      },
    );
    if (!res.ok) throw new Error(await readErrorMessage(res, `HTTP ${res.status}`));
    return res.json();
  }

  static async optimizeRoute(dispatchId: string) {
    const res = await fetch(apiUrl(`/delivery/admin/dispatches/${dispatchId}/optimize-route`), {
      method: "POST",
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error(await readErrorMessage(res, `HTTP ${res.status}`));
    return res.json();
  }

  static async createDispatch(body: { occurrenceId: string; driverUserId?: string | null }) {
    const res = await fetch(apiUrl("/delivery/admin/dispatches"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await readErrorMessage(res, `HTTP ${res.status}`));
    return res.json();
  }
}
