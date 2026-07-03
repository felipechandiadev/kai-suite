import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  CertificationRun,
  FiscalCafItem,
  FiscalCafPackage,
  FiscalCafPackageDetail,
  FiscalCafPackageStatus,
  FiscalEmissionRow,
  FiscalEmissionsListParams,
  FiscalPackLedgerSummary,
  FiscalProfile,
  FiscalSubPack,
  FiscalSummary,
  SiiEnvironment,
} from "../types/fiscal.types";

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) throw new Error("BACKEND_API_URL no está definida");
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function authHeadersJson(): Promise<HeadersInit> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  if (activeCompanyId) h["X-Active-Company-Id"] = activeCompanyId;
  return h;
}

async function authHeadersMultipart(): Promise<HeadersInit> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
  const h: Record<string, string> = {};
  if (token) h.Authorization = `Bearer ${token}`;
  if (activeCompanyId) h["X-Active-Company-Id"] = activeCompanyId;
  return h;
}

function errorMessage(json: unknown, fallback: string): string {
  if (json && typeof json === "object") {
    const o = json as Record<string, unknown>;
    if (typeof o.message === "string") return o.message;
    if (Array.isArray(o.message)) return o.message.join(", ");
  }
  return fallback;
}

async function backendFetch(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; res: Response } | { ok: false; error: string }> {
  try {
    const res = await fetch(apiUrl(path), init);
    return { ok: true, res };
  } catch {
    const base = process.env.BACKEND_API_URL ?? "BACKEND_API_URL";
    return {
      ok: false,
      error: `No se pudo conectar al backend (${base}). Verifique que esté en ejecución.`,
    };
  }
}

export class FiscalRequest {
  static async getSummary(): Promise<
    { success: true; summary: FiscalSummary } | { success: false; error: string }
  > {
    const fetched = await backendFetch("/company/fiscal-profile/summary", {
      headers: await authHeadersJson(),
      cache: "no-store",
    });
    if (!fetched.ok) return { success: false, error: fetched.error };
    const json = await fetched.res.json();
    if (!fetched.res.ok) return { success: false, error: errorMessage(json, "Error al cargar resumen SII") };
    return { success: true, summary: json.summary as FiscalSummary };
  }

  static async getProfile(): Promise<
    { success: true; fiscalProfile: FiscalProfile } | { success: false; error: string }
  > {
    const fetched = await backendFetch("/company/fiscal-profile", {
      headers: await authHeadersJson(),
      cache: "no-store",
    });
    if (!fetched.ok) return { success: false, error: fetched.error };
    const json = await fetched.res.json();
    if (!fetched.res.ok) return { success: false, error: errorMessage(json, "Error al cargar perfil fiscal") };
    return { success: true, fiscalProfile: json.fiscalProfile as FiscalProfile };
  }

  static async updateProfile(body: Record<string, unknown>) {
    const res = await fetch(apiUrl("/company/fiscal-profile"), {
      method: "PUT",
      headers: await authHeadersJson(),
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) return { success: false as const, error: errorMessage(json, "Error al guardar") };
    return { success: true as const, fiscalProfile: json.fiscalProfile as FiscalProfile };
  }

  static async uploadCertificate(file: File, password: string) {
    const form = new FormData();
    form.append("file", file);
    form.append("password", password);
    const res = await fetch(apiUrl("/company/fiscal-certificate"), {
      method: "POST",
      headers: await authHeadersMultipart(),
      body: form,
    });
    const json = await res.json();
    if (!res.ok || json.success === false) {
      return {
        success: false as const,
        error: errorMessage(json, json.message ?? "Error al subir certificado"),
      };
    }
    return { success: true as const, fiscalProfile: json.fiscalProfile as FiscalProfile };
  }

  static async deleteCertificate() {
    const res = await fetch(apiUrl("/company/fiscal-certificate"), {
      method: "DELETE",
      headers: await authHeadersJson(),
    });
    const json = await res.json();
    if (!res.ok) return { success: false as const, error: errorMessage(json, "Error al eliminar") };
    return { success: true as const, fiscalProfile: json.fiscalProfile as FiscalProfile };
  }

  static async uploadCaf(file: File, environment?: SiiEnvironment) {
    const form = new FormData();
    form.append("file", file);
    if (environment) form.append("environment", environment);
    const res = await fetch(apiUrl("/company/fiscal-caf"), {
      method: "POST",
      headers: await authHeadersMultipart(),
      body: form,
    });
    const json = await res.json();
    if (!res.ok || json.success === false) {
      return { success: false as const, error: errorMessage(json, "Error al subir CAF") };
    }
    return { success: true as const, cafs: json.cafs as FiscalCafItem[] };
  }

  static async listCafs() {
    const res = await fetch(apiUrl("/company/fiscal-cafs"), {
      headers: await authHeadersJson(),
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) return { success: false as const, error: errorMessage(json, "Error al listar CAF") };
    return { success: true as const, cafs: json.cafs as FiscalCafItem[] };
  }

  static async listEmissions(params: FiscalEmissionsListParams = {}) {
    const qs = new URLSearchParams();
    if (params.limit != null) qs.set("limit", String(params.limit));
    if (params.offset != null) qs.set("offset", String(params.offset));
    if (params.status) qs.set("status", params.status);
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
    if (params.environment) qs.set("environment", params.environment);
    if (params.folio != null) qs.set("folio", String(params.folio));
    if (params.cafId) qs.set("cafId", params.cafId);
    if (params.allocationId) qs.set("allocationId", params.allocationId);
    if (params.folioFrom != null) qs.set("folioFrom", String(params.folioFrom));
    if (params.folioTo != null) qs.set("folioTo", String(params.folioTo));
    if (params.pointOfSaleId) qs.set("pointOfSaleId", params.pointOfSaleId);
    const query = qs.toString();
    const res = await fetch(apiUrl(`/company/fiscal/emissions${query ? `?${query}` : ""}`), {
      headers: await authHeadersJson(),
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false as const, error: errorMessage(json, "Error al listar emisiones") };
    }
    return {
      success: true as const,
      items: json.items as FiscalEmissionRow[],
      total: Number(json.total) || 0,
    };
  }

  static async retryBoletaEmission(transactionId: string) {
    const res = await fetch(
      apiUrl(`/company/fiscal/boletas/transactions/${encodeURIComponent(transactionId)}/retry`),
      { method: "POST", headers: await authHeadersJson() },
    );
    const json = await res.json();
    if (!res.ok) {
      return { success: false as const, error: errorMessage(json, "Error al reintentar envío") };
    }
    return { success: true as const, fiscalEmission: json.fiscalEmission as Record<string, unknown> };
  }

  static async refreshEmissionSiiStatus(emissionId: string) {
    const res = await fetch(
      apiUrl(`/company/fiscal/emissions/${encodeURIComponent(emissionId)}/refresh-sii-status`),
      { method: "POST", headers: await authHeadersJson() },
    );
    const json = await res.json();
    if (!res.ok) {
      return { success: false as const, error: errorMessage(json, "Error al consultar estado SII") };
    }
    return { success: true as const, item: json.item as FiscalEmissionRow };
  }

  static async getBoletaPrintPreview(caso?: string) {
    const qs = caso ? `?caso=${encodeURIComponent(caso)}` : "";
    const fetched = await backendFetch(`/company/fiscal/boleta/print-preview${qs}`, {
      headers: await authHeadersJson(),
      cache: "no-store",
    });
    if (!fetched.ok) return { success: false as const, error: fetched.error };
    const json = await fetched.res.json();
    if (!fetched.res.ok) {
      return { success: false as const, error: errorMessage(json, "Error al cargar preview de boleta") };
    }
    return {
      success: true as const,
      preview: json.preview as import("../types/fiscal.types").FiscalBoletaPrintPreview,
    };
  }

  static async testSiiToken() {
    const res = await fetch(apiUrl("/company/fiscal/sii/test-token"), {
      method: "POST",
      headers: await authHeadersJson(),
    });
    const json = await res.json();
    if (!res.ok) return { success: false as const, error: errorMessage(json, "Token SII falló") };
    return {
      success: true as const,
      tokenPreview: String(json.tokenPreview ?? ""),
    };
  }

  static async createCertificationRun() {
    const res = await fetch(apiUrl("/company/fiscal/certification/runs"), {
      method: "POST",
      headers: await authHeadersJson(),
    });
    const json = await res.json();
    if (!res.ok) return { success: false as const, error: errorMessage(json, "Error al crear corrida") };
    return { success: true as const, run: json.run as CertificationRun };
  }

  static async generateSet(runId: string) {
    const res = await fetch(apiUrl(`/company/fiscal/certification/runs/${runId}/generate`), {
      method: "POST",
      headers: await authHeadersJson(),
    });
    const json = await res.json();
    if (!res.ok) return { success: false as const, error: errorMessage(json, "Error al generar set") };
    return { success: true as const, run: json.run as CertificationRun };
  }

  static async sendBoletas(runId: string) {
    const res = await fetch(apiUrl(`/company/fiscal/certification/runs/${runId}/send-boletas`), {
      method: "POST",
      headers: await authHeadersJson(),
    });
    const json = await res.json();
    if (!res.ok) return { success: false as const, error: errorMessage(json, "Error al enviar boletas") };
    return { success: true as const, run: json.run as CertificationRun };
  }

  static async sendRco(runId: string) {
    const res = await fetch(apiUrl(`/company/fiscal/certification/runs/${runId}/send-rco`), {
      method: "POST",
      headers: await authHeadersJson(),
    });
    const json = await res.json();
    if (!res.ok) return { success: false as const, error: errorMessage(json, "Error al enviar RCO") };
    return { success: true as const, run: json.run as CertificationRun };
  }

  static async queryStatus(runId: string) {
    const res = await fetch(apiUrl(`/company/fiscal/certification/runs/${runId}/status`), {
      headers: await authHeadersJson(),
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) return { success: false as const, error: errorMessage(json, "Error al consultar estado") };
    return { success: true as const, run: json.run as CertificationRun };
  }

  static async completeCertification(
    runId: string,
    portalValidated: boolean,
    portalDeclarationDone: boolean,
  ) {
    const res = await fetch(apiUrl(`/company/fiscal/certification/runs/${runId}/complete`), {
      method: "POST",
      headers: await authHeadersJson(),
      body: JSON.stringify({ portalValidated, portalDeclarationDone }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false as const, error: errorMessage(json, "Error al completar") };
    return { success: true as const, fiscalProfile: json.fiscalProfile as FiscalProfile };
  }

  static async acknowledgePortalCertification() {
    const res = await fetch(apiUrl("/company/fiscal-profile/acknowledge-certification"), {
      method: "POST",
      headers: await authHeadersJson(),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false as const, error: errorMessage(json, "No se pudo registrar certificación") };
    }
    return { success: true as const, fiscalProfile: json.fiscalProfile as FiscalProfile };
  }

  static async enableProduction(productionEnabled: boolean, environment: SiiEnvironment) {
    const res = await fetch(apiUrl("/company/fiscal-profile/production"), {
      method: "PUT",
      headers: await authHeadersJson(),
      body: JSON.stringify({ productionEnabled, environment }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false as const, error: errorMessage(json, "Error al actualizar producción") };
    return { success: true as const, fiscalProfile: json.fiscalProfile as FiscalProfile };
  }

  static async listCafPackages(params?: {
    dteType?: number;
    environment?: SiiEnvironment;
    status?: FiscalCafPackageStatus;
  }) {
    const qs = new URLSearchParams();
    if (params?.dteType != null) qs.set("dteType", String(params.dteType));
    if (params?.environment) qs.set("environment", params.environment);
    if (params?.status) qs.set("status", params.status);
    const query = qs.toString();
    const res = await fetch(apiUrl(`/company/fiscal-caf-packages${query ? `?${query}` : ""}`), {
      headers: await authHeadersJson(),
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) return { success: false as const, error: errorMessage(json, "Error al listar paquetes") };
    return {
      success: true as const,
      packages: Array.isArray(json.packages) ? (json.packages as FiscalCafPackage[]) : [],
    };
  }

  static async getCafPackageDetail(cafId: string) {
    const res = await fetch(apiUrl(`/company/fiscal-caf-packages/${encodeURIComponent(cafId)}`), {
      headers: await authHeadersJson(),
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) return { success: false as const, error: errorMessage(json, "Error al cargar paquete") };
    return { success: true as const, package: json.package as FiscalCafPackageDetail };
  }

  static async getPackLedgerSummary(cafId: string) {
    const res = await fetch(
      apiUrl(`/company/fiscal-caf-packages/${encodeURIComponent(cafId)}/ledger-summary`),
      { headers: await authHeadersJson(), cache: "no-store" },
    );
    const json = await res.json();
    if (!res.ok) return { success: false as const, error: errorMessage(json, "Error al cargar resumen") };
    return { success: true as const, summary: json.summary as FiscalPackLedgerSummary };
  }

  static async getSubPackLedgerSummary(allocationId: string) {
    const res = await fetch(
      apiUrl(
        `/company/fiscal-caf-packages/allocations/${encodeURIComponent(allocationId)}/ledger-summary`,
      ),
      { headers: await authHeadersJson(), cache: "no-store" },
    );
    const json = await res.json();
    if (!res.ok) return { success: false as const, error: errorMessage(json, "Error al cargar resumen") };
    return { success: true as const, summary: json.summary as FiscalPackLedgerSummary };
  }

  static async createSubPack(
    cafId: string,
    body: { pointOfSaleId: string; rangeFrom: number; rangeTo: number; label?: string },
  ) {
    const res = await fetch(apiUrl(`/company/fiscal-caf-packages/${encodeURIComponent(cafId)}/allocations`), {
      method: "POST",
      headers: await authHeadersJson(),
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) return { success: false as const, error: errorMessage(json, "Error al asignar sub-paquete") };
    return { success: true as const, allocation: json.allocation as Record<string, unknown> };
  }

  static async updateSubPack(
    allocationId: string,
    body: { rangeFrom?: number; rangeTo?: number; label?: string },
  ) {
    const res = await fetch(
      apiUrl(`/company/fiscal-caf-packages/allocations/${encodeURIComponent(allocationId)}`),
      { method: "PUT", headers: await authHeadersJson(), body: JSON.stringify(body) },
    );
    const json = await res.json();
    if (!res.ok) return { success: false as const, error: errorMessage(json, "Error al actualizar sub-paquete") };
    return { success: true as const, allocation: json.allocation as Record<string, unknown> };
  }

  static async deleteSubPack(allocationId: string) {
    const res = await fetch(
      apiUrl(`/company/fiscal-caf-packages/allocations/${encodeURIComponent(allocationId)}`),
      { method: "DELETE", headers: await authHeadersJson() },
    );
    const json = await res.json();
    if (!res.ok) return { success: false as const, error: errorMessage(json, "Error al eliminar sub-paquete") };
    return { success: true as const };
  }

  static async updatePackageStatus(cafId: string, status: FiscalCafPackageStatus) {
    const res = await fetch(apiUrl(`/company/fiscal-caf-packages/${encodeURIComponent(cafId)}/status`), {
      method: "PATCH",
      headers: await authHeadersJson(),
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false as const, error: errorMessage(json, "Error al actualizar estado") };
    return { success: true as const, package: json.package as FiscalCafPackage };
  }
}
