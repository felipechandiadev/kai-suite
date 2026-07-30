import { getServerBackendApiBase } from "@/lib/backend-api-url";

export type PublicCompany = {
  id: string;
  razonSocial: string;
  nombreFantasia: string | null;
  rut: string | null;
};

type RawCompany = {
  id?: string | null;
  razonSocial?: string | null;
  nombreFantasia?: string | null;
  rut?: string | null;
};

function normalize(raw: RawCompany): PublicCompany | null {
  if (!raw?.id || !raw.razonSocial) return null;
  const rutTrim =
    raw.rut != null && String(raw.rut).trim() !== "" ? String(raw.rut).trim() : null;
  return {
    id: String(raw.id),
    razonSocial: String(raw.razonSocial),
    nombreFantasia:
      raw.nombreFantasia != null && String(raw.nombreFantasia).trim() !== ""
        ? String(raw.nombreFantasia)
        : null,
    rut: rutTrim,
  };
}

export class PublicCompaniesRequest {
  /**
   * Llama al endpoint público `GET /api/companies/public/list` (sin auth)
   * pensado para la pantalla de setup del POS. Devuelve solo las empresas
   * activas con campos mínimos para identificación visual.
   */
  static async list(): Promise<
    | { success: true; companies: PublicCompany[] }
    | { success: false; error: string }
  > {
    let base: string;
    try {
      base = getServerBackendApiBase();
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "BACKEND_API_URL no está definida",
      };
    }
    try {
      const res = await fetch(`${base}/api/companies/public/list`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (!res.ok) {
        const text = await res.text();
        return { success: false, error: text || res.statusText };
      }
      const data = (await res.json()) as { companies?: RawCompany[] };
      const arr = Array.isArray(data.companies) ? data.companies : [];
      const companies = arr
        .map((r) => normalize(r))
        .filter((c): c is PublicCompany => c != null);
      return { success: true, companies };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al listar empresas",
      };
    }
  }
}
