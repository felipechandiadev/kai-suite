import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  DeliveryCoverageResponse,
  DeliveryGeocodeResult,
  DeliveryOccurrenceOption,
  DeliveryQuoteResult,
  ResolvedDeliveryZone,
} from "../types/delivery-api.types";

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
  const activeCompanyId = (session?.user as { activeCompanyId?: string })
    ?.activeCompanyId;
  if (!token) return { ok: false, message: "No autenticado" };
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;
  return { ok: true, headers };
}

export class PosDeliveryRequest {
  static async coverage(): Promise<
    | { success: true; data: DeliveryCoverageResponse }
    | { success: false; message: string }
  > {
    const base = process.env.BACKEND_API_URL;
    if (!base) return { success: false, message: "BACKEND_API_URL is not set" };
    const auth = await authHeaders();
    if (!auth.ok) return { success: false, message: auth.message };
    const res = await backendFetch(`${base}/api/e-shop/pos/delivery/coverage`, {
      method: "GET",
      headers: auth.headers,
    });
    if (!res) return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      return {
        success: false,
        message: body.message || "No se pudo cargar la cobertura de reparto",
      };
    }
    return { success: true, data: (await res.json()) as DeliveryCoverageResponse };
  }

  static async geocode(body: {
    address: string;
    commune?: string;
    region?: string;
  }): Promise<
    | { success: true; data: DeliveryGeocodeResult }
    | { success: false; message: string }
  > {
    const base = process.env.BACKEND_API_URL;
    if (!base) return { success: false, message: "BACKEND_API_URL is not set" };
    const auth = await authHeaders();
    if (!auth.ok) return { success: false, message: auth.message };
    const res = await backendFetch(`${base}/api/e-shop/pos/delivery/geocode`, {
      method: "POST",
      headers: auth.headers,
      body: JSON.stringify(body),
    });
    if (!res) return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { message?: string };
      return {
        success: false,
        message: err.message || "No se pudo geocodificar la dirección",
      };
    }
    return { success: true, data: (await res.json()) as DeliveryGeocodeResult };
  }

  static async resolveZone(body: {
    latitude?: number;
    longitude?: number;
    communeCode?: string;
    commune?: string;
  }): Promise<
    | { success: true; data: { zone: ResolvedDeliveryZone | null; covered: boolean } }
    | { success: false; message: string }
  > {
    const base = process.env.BACKEND_API_URL;
    if (!base) return { success: false, message: "BACKEND_API_URL is not set" };
    const auth = await authHeaders();
    if (!auth.ok) return { success: false, message: auth.message };
    const res = await backendFetch(
      `${base}/api/e-shop/pos/delivery/resolve-zone`,
      {
        method: "POST",
        headers: auth.headers,
        body: JSON.stringify(body),
      },
    );
    if (!res) return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { message?: string };
      return {
        success: false,
        message: err.message || "No se pudo resolver la zona",
      };
    }
    return {
      success: true,
      data: (await res.json()) as {
        zone: ResolvedDeliveryZone | null;
        covered: boolean;
      },
    };
  }

  static async quote(
    zoneId: string,
    subtotal: number,
  ): Promise<
    | { success: true; data: DeliveryQuoteResult }
    | { success: false; message: string }
  > {
    const base = process.env.BACKEND_API_URL;
    if (!base) return { success: false, message: "BACKEND_API_URL is not set" };
    const auth = await authHeaders();
    if (!auth.ok) return { success: false, message: auth.message };
    const qs = new URLSearchParams({
      zoneId,
      subtotal: String(subtotal),
    });
    const res = await backendFetch(
      `${base}/api/e-shop/pos/delivery/quote?${qs.toString()}`,
      { method: "GET", headers: auth.headers },
    );
    if (!res) return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { message?: string };
      return {
        success: false,
        message: err.message || "No se pudo cotizar el envío",
      };
    }
    return { success: true, data: (await res.json()) as DeliveryQuoteResult };
  }

  static async availableOccurrences(
    zoneId: string,
  ): Promise<
    | { success: true; data: DeliveryOccurrenceOption[] }
    | { success: false; message: string }
  > {
    const base = process.env.BACKEND_API_URL;
    if (!base) return { success: false, message: "BACKEND_API_URL is not set" };
    const auth = await authHeaders();
    if (!auth.ok) return { success: false, message: auth.message };
    const qs = new URLSearchParams({ zoneId });
    const res = await backendFetch(
      `${base}/api/e-shop/pos/delivery/available-occurrences?${qs.toString()}`,
      { method: "GET", headers: auth.headers },
    );
    if (!res) return { success: false, message: BACKEND_CONNECTION_MESSAGE };
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { message?: string };
      return {
        success: false,
        message: err.message || "No se pudieron cargar las franjas",
      };
    }
    return {
      success: true,
      data: (await res.json()) as DeliveryOccurrenceOption[],
    };
  }
}
