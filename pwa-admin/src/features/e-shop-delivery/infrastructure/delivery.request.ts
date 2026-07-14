import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  DeliveryCommuneRow,
  DeliveryOccurrenceRow,
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

export class DeliveryRequest {
  static async getSettings(): Promise<DeliverySettingsRow> {
    const res = await fetch(apiUrl("/e-shop/admin/delivery/settings"), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async updateSettings(body: Partial<DeliverySettingsRow>) {
    const res = await fetch(apiUrl("/e-shop/admin/delivery/settings"), {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async listCommunes(): Promise<DeliveryCommuneRow[]> {
    const res = await fetch(apiUrl("/e-shop/admin/delivery/communes"), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async setCommuneEnabled(id: string, isEnabled: boolean) {
    const res = await fetch(apiUrl(`/e-shop/admin/delivery/communes/${id}`), {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify({ isEnabled }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async listZones(): Promise<DeliveryZoneRow[]> {
    const res = await fetch(apiUrl("/e-shop/admin/delivery/zones"), {
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
    const res = await fetch(apiUrl("/e-shop/admin/delivery/zones"), {
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
    const res = await fetch(apiUrl(`/e-shop/admin/delivery/calendar/occurrences?${qs}`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async createOccurrence(body: {
    name: string;
    occurrenceDate: string;
    departureTime: string;
    orderCutoffTime: string;
    maxOrders?: number | null;
    zoneIds?: string[];
  }) {
    const res = await fetch(apiUrl("/e-shop/admin/delivery/calendar/occurrences"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async getOperationsBoard() {
    const res = await fetch(apiUrl("/e-shop/admin/delivery/operations"), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async updateOrderStatus(id: string, status: string) {
    const res = await fetch(apiUrl(`/e-shop/admin/delivery/orders/${id}/status`), {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async optimizeRoute(dispatchId: string) {
    const res = await fetch(apiUrl(`/e-shop/admin/delivery/dispatches/${dispatchId}/optimize-route`), {
      method: "POST",
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async createDispatch(body: { occurrenceId: string; driverUserId?: string | null }) {
    const res = await fetch(apiUrl("/e-shop/admin/delivery/dispatches"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
}
