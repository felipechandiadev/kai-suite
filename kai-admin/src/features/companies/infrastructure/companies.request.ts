import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  CompanyDetail,
  CompanyOption,
  CreateCompanyInput,
  UpdateCompanyInput,
} from "../types/company.types";

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
  const activeCompanyId = (session?.user as any)?.activeCompanyId as string | null | undefined;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  if (activeCompanyId) {
    h["X-Active-Company-Id"] = activeCompanyId;
  }
  return h;
}

export class CompaniesRequest {
  static async list(includeInactive = false): Promise<
    | { success: true; companies: CompanyDetail[] }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(
        apiUrl(`companies${includeInactive ? "?includeInactive=true" : ""}`),
        {
          method: "GET",
          headers: await authHeaders(),
          cache: "no-store",
        },
      );
      if (!res.ok) {
        const t = await res.text();
        return { success: false, error: t || res.statusText };
      }
      const data = await res.json();
      return {
        success: true,
        companies: Array.isArray(data?.companies) ? data.companies : [],
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al listar empresas",
      };
    }
  }

  static async get(id: string): Promise<
    { success: true; company: CompanyDetail } | { success: false; error: string }
  > {
    try {
      const res = await fetch(apiUrl(`companies/${encodeURIComponent(id)}`), {
        method: "GET",
        headers: await authHeaders(),
        cache: "no-store",
      });
      if (!res.ok) {
        const t = await res.text();
        return { success: false, error: t || res.statusText };
      }
      const data = await res.json();
      if (data?.company) {
        return { success: true, company: data.company };
      }
      return { success: false, error: "Empresa no encontrada" };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al obtener empresa",
      };
    }
  }

  static async create(body: CreateCompanyInput): Promise<
    { success: true; company: CompanyDetail } | { success: false; error: string }
  > {
    try {
      const res = await fetch(apiUrl("companies"), {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data?.message || res.statusText };
      }
      if (data?.company) {
        return { success: true, company: data.company };
      }
      return { success: false, error: "No se pudo crear la empresa" };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al crear empresa",
      };
    }
  }

  static async update(
    id: string,
    body: UpdateCompanyInput,
  ): Promise<
    { success: true; company: CompanyDetail } | { success: false; error: string }
  > {
    try {
      const res = await fetch(apiUrl(`companies/${encodeURIComponent(id)}`), {
        method: "PATCH",
        headers: await authHeaders(),
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data?.message || res.statusText };
      }
      if (data?.company) {
        return { success: true, company: data.company };
      }
      return { success: false, error: "No se pudo actualizar la empresa" };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al actualizar empresa",
      };
    }
  }

  static async remove(
    id: string,
  ): Promise<{ success: true } | { success: false; error: string }> {
    try {
      const res = await fetch(apiUrl(`companies/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers: await authHeaders(),
        cache: "no-store",
      });
      if (!res.ok) {
        const t = await res.text();
        return { success: false, error: t || res.statusText };
      }
      return { success: true };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al eliminar empresa",
      };
    }
  }

  /**
   * Lista las empresas disponibles para el usuario actual (ADMIN ve todas, OPERATOR ve solo la suya).
   */
  static async listAvailable(): Promise<
    | { success: true; companies: CompanyOption[] }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(apiUrl("auth/companies"), {
        method: "GET",
        headers: await authHeaders(),
        cache: "no-store",
      });
      if (!res.ok) {
        const t = await res.text();
        return { success: false, error: t || res.statusText };
      }
      const data = await res.json();
      return {
        success: true,
        companies: Array.isArray(data?.companies) ? data.companies : [],
      };
    } catch (e) {
      return {
        success: false,
        error:
          e instanceof Error ? e.message : "Error al cargar empresas disponibles",
      };
    }
  }

  /**
   * Cambia la empresa activa (SUPER_ADMIN o usuario con membership).
   * También puede entrar a Multiempresa: `{ multiCompanyMode: true }`.
   */
  static async switchCompany(
    companyIdOrMulti: string | { multiCompanyMode: true },
  ): Promise<
    | {
        success: true;
        activeCompanyId: string | null;
        multiCompanyMode?: boolean;
        company?: CompanyOption;
      }
    | { success: false; error: string }
  > {
    try {
      const body =
        typeof companyIdOrMulti === "string"
          ? { companyId: companyIdOrMulti }
          : companyIdOrMulti;
      const res = await fetch(apiUrl("auth/switch-company"), {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data?.message || res.statusText };
      }
      if (data?.multiCompanyMode) {
        return {
          success: true,
          activeCompanyId: null,
          multiCompanyMode: true,
        };
      }
      if (data?.activeCompanyId) {
        return {
          success: true,
          activeCompanyId: data.activeCompanyId,
          multiCompanyMode: false,
          company: data.company,
        };
      }
      return { success: false, error: "Respuesta inválida del servidor" };
    } catch (e) {
      return {
        success: false,
        error:
          e instanceof Error ? e.message : "Error al cambiar de empresa",
      };
    }
  }
}
