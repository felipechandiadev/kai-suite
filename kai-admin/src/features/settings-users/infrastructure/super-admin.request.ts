import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  CreateSuperAdminInput,
  SuperAdminUser,
} from "../types/super-admin.types";

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
  const activeCompanyId = (session?.user as any)?.activeCompanyId as
    | string
    | null
    | undefined;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  if (activeCompanyId) {
    h["X-Active-Company-Id"] = activeCompanyId;
  }
  return h;
}

function normalize(raw: unknown): SuperAdminUser | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : null;
  const userName = o.userName != null ? String(o.userName) : "";
  if (!id || !userName) return null;

  let person: SuperAdminUser["person"] | undefined;
  const personRaw = o.person;
  if (personRaw && typeof personRaw === "object" && !Array.isArray(personRaw)) {
    const p = personRaw as Record<string, unknown>;
    person = {
      name: p.name != null ? String(p.name) : undefined,
      firstName: p.firstName != null ? String(p.firstName) : undefined,
      lastName: p.lastName != null ? String(p.lastName) : undefined,
      email: p.email != null ? String(p.email) : null,
      dni: p.dni != null ? String(p.dni) : null,
      phone: p.phone != null ? String(p.phone) : null,
    };
  }

  return {
    id,
    userName,
    mail: o.mail != null ? String(o.mail) : "",
    rol: "SUPER_ADMIN",
    companyId: null,
    nonDeletable: !!o.nonDeletable,
    person,
  };
}

export class SuperAdminRequest {
  static async list(): Promise<
    | { success: true; items: SuperAdminUser[] }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(apiUrl("users/super-admins"), {
        method: "GET",
        headers: await authHeaders(),
        cache: "no-store",
      });
      if (!res.ok) {
        const t = await res.text();
        return { success: false, error: t || res.statusText };
      }
      const data = (await res.json()) as Record<string, unknown>;
      const arr = Array.isArray(data.items) ? (data.items as unknown[]) : [];
      const items = arr
        .map((r) => normalize(r))
        .filter((u): u is SuperAdminUser => u != null);
      return { success: true, items };
    } catch (e) {
      return {
        success: false,
        error:
          e instanceof Error ? e.message : "Error al listar super-administradores",
      };
    }
  }

  static async create(body: CreateSuperAdminInput): Promise<
    { success: true; data: SuperAdminUser } | { success: false; error: string }
  > {
    try {
      const res = await fetch(apiUrl("users"), {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          userName: body.userName.trim(),
          mail: body.mail.trim(),
          password: body.password,
          rol: "SUPER_ADMIN",
          companyId: null,
          person: {
            firstName: body.firstName.trim(),
            lastName: body.lastName?.trim() || undefined,
            email: body.mail.trim(),
          },
        }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!res.ok) {
        const msg =
          typeof data.message === "string"
            ? data.message
            : typeof data.error === "string"
              ? data.error
              : res.statusText;
        return {
          success: false,
          error: msg || "No se pudo crear el super-administrador",
        };
      }
      const userRaw =
        data.user && typeof data.user === "object"
          ? (data.user as Record<string, unknown>)
          : data;
      const item = normalize(userRaw);
      if (item) {
        return { success: true, data: item };
      }
      return { success: false, error: "Respuesta inesperada del servidor" };
    } catch (e) {
      return {
        success: false,
        error:
          e instanceof Error
            ? e.message
            : "Error al crear super-administrador",
      };
    }
  }

  static async remove(
    id: string,
  ): Promise<{ success: true } | { success: false; error: string }> {
    try {
      const res = await fetch(apiUrl(`users/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers: await authHeaders(),
        cache: "no-store",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;
        const msg =
          typeof data.message === "string"
            ? data.message
            : typeof data.error === "string"
              ? data.error
              : res.statusText;
        return { success: false, error: msg || "No se pudo eliminar" };
      }
      return { success: true };
    } catch (e) {
      return {
        success: false,
        error:
          e instanceof Error
            ? e.message
            : "Error al eliminar super-administrador",
      };
    }
  }
}
