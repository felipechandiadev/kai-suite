import { getServerBackendApiBase } from "@/lib/backend-api-url";

export type PublicCompany = {
  id: string;
  razonSocial: string;
  nombreFantasia: string | null;
  rut: string | null;
};

export class PublicCompaniesRequest {
  static async list(): Promise<
    { success: true; companies: PublicCompany[] } | { success: false; error: string }
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
        return { success: false, error: (await res.text()) || res.statusText };
      }
      const data = (await res.json()) as { companies?: PublicCompany[] };
      const arr = Array.isArray(data.companies) ? data.companies : [];
      return { success: true, companies: arr.filter((c) => c?.id && c.razonSocial) };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al listar empresas",
      };
    }
  }
}
