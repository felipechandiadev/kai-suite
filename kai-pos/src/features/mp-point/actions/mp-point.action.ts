"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { getServerBackendApiBase } from "@/lib/backend-api-url";

export type MpPointIntentPublic = {
  id: string;
  status: string;
  amount: number;
  metadata?: {
    authorizationCode?: string | null;
    paymentType?: string | null;
  } | null;
};

async function authHeaders(): Promise<Record<string, string>> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })
    ?.activeCompanyId;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  if (activeCompanyId) h["X-Active-Company-Id"] = activeCompanyId;
  return h;
}

export async function getPosMercadoPagoSettingsAction() {
  try {
    const res = await fetch(`${getServerBackendApiBase()}/api/company/mercado-pago-settings`, {
      headers: await authHeaders(),
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) return { success: false as const, posPointEnabled: false };
    const s = json.mercadoPagoSettings as { enabled?: boolean; posPointEnabled?: boolean };
    return {
      success: true as const,
      posPointEnabled: Boolean(s?.enabled && s?.posPointEnabled),
    };
  } catch {
    return { success: false as const, posPointEnabled: false };
  }
}

export async function createMpPointIntentAction(input: {
  amount: number;
  cashSessionId: string;
  pointOfSaleId: string;
  saleAmount?: number | null;
  tipAmount?: number | null;
}) {
  try {
    const res = await fetch(`${getServerBackendApiBase()}/api/pos/mp-point/intents`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!res.ok) {
      const msg =
        typeof json?.message === "string"
          ? json.message
          : Array.isArray(json?.message)
            ? json.message.join(", ")
            : "No se pudo iniciar cobro Point";
      return { success: false as const, message: msg };
    }
    return { success: true as const, intent: json as MpPointIntentPublic };
  } catch {
    return { success: false as const, message: "Error de conexión con el servidor" };
  }
}

export async function getMpPointIntentAction(intentId: string) {
  try {
    const res = await fetch(
      `${getServerBackendApiBase()}/api/pos/mp-point/intents/${encodeURIComponent(intentId)}`,
      { headers: await authHeaders(), cache: "no-store" },
    );
    const json = await res.json();
    if (!res.ok) {
      return { success: false as const, message: "No se pudo consultar el cobro" };
    }
    return { success: true as const, intent: json as MpPointIntentPublic };
  } catch {
    return { success: false as const, message: "Error de conexión" };
  }
}
