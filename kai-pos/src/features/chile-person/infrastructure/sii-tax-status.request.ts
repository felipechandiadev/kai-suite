import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { LookupSiiTaxStatusResult, SiiTaxStatusView } from "../types/sii-tax-status.types";

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
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  if (activeCompanyId) h["X-Active-Company-Id"] = activeCompanyId;
  return h;
}

function normalizeActivity(raw: unknown): SiiTaxStatusView["economicActivities"][number] | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const code = o.code != null ? String(o.code).trim() : "";
  if (!code) return null;
  const category = String(o.category ?? "PRIMERA").toUpperCase() === "SEGUNDA" ? "SEGUNDA" : "PRIMERA";
  return {
    code,
    name: o.name != null ? String(o.name) : code,
    category,
    ivaAffected: o.ivaAffected === true,
    requiresOverrides: o.requiresOverrides === true,
  };
}

function normalizeView(raw: unknown): SiiTaxStatusView | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const activitiesRaw = Array.isArray(o.economicActivities) ? o.economicActivities : [];
  const economicActivities = activitiesRaw
    .map(normalizeActivity)
    .filter((a): a is NonNullable<typeof a> => a != null);
  return {
    rut: o.rut != null ? String(o.rut) : "",
    legalName: o.legalName != null ? String(o.legalName) : "",
    activityStarted: o.activityStarted === true,
    activityStartDate:
      o.activityStartDate != null && String(o.activityStartDate).trim() !== ""
        ? String(o.activityStartDate)
        : null,
    smallBusiness: o.smallBusiness != null ? String(o.smallBusiness) : null,
    foreignCurrencyAuth:
      o.foreignCurrencyAuth != null ? String(o.foreignCurrencyAuth) : null,
    economicActivities,
    warnings: Array.isArray(o.warnings) ? o.warnings.map(String) : [],
    fetchedAt: o.fetchedAt != null ? String(o.fetchedAt) : new Date().toISOString(),
  };
}

export async function lookupSiiTaxStatusRequest(rut: string): Promise<LookupSiiTaxStatusResult> {
  const qs = new URLSearchParams({ rut: rut.trim() });
  try {
    const res = await fetch(apiUrl(`/persons/sii/tax-status?${qs}`), {
      method: "GET",
      headers: await authHeaders(),
      cache: "no-store",
    });
    const json = (await res.json()) as { success?: boolean; data?: unknown; message?: string };
    if (!res.ok || json.success !== true) {
      return {
        success: false,
        error: json.message != null ? String(json.message) : `Error ${res.status}`,
      };
    }
    const data = normalizeView(json.data);
    if (!data?.legalName) {
      return { success: false, error: "Respuesta inválida del SII" };
    }
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "No se pudo consultar el SII",
    };
  }
}
