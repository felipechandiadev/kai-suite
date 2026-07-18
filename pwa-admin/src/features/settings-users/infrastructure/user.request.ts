import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { UserListItem } from "../types/user.types";

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

function toListItem(row: unknown): UserListItem | null {
  if (!row || typeof row !== "object") {
    return null;
  }
  const o = row as Record<string, unknown>;
  const id = o.id != null && String(o.id) ? String(o.id) : null;
  const userName = o.userName != null ? String(o.userName) : "";
  const mail = o.mail != null ? String(o.mail) : "";
  if (!id || !userName) {
    return null;
  }
  const personRaw = o.person;
  let person: UserListItem["person"] = null;
  if (personRaw && typeof personRaw === "object" && !Array.isArray(personRaw)) {
    const p = personRaw as Record<string, unknown>;
    const doc =
      p.documentNumber != null
        ? String(p.documentNumber)
        : p.dni != null
          ? String(p.dni)
          : "";
    person = {
      id: p.id != null ? String(p.id) : null,
      firstName: p.firstName != null ? String(p.firstName) : null,
      lastName: p.lastName != null ? String(p.lastName) : null,
      phone: p.phone != null && String(p.phone).trim() ? String(p.phone) : null,
      documentNumber: doc.trim() ? doc : null,
    };
  }
  return {
    id,
    userName,
    mail,
    rol: o.rol != null ? String(o.rol) : "OPERATOR",
    personId:
      o.personId != null
        ? String(o.personId)
        : person?.id != null
          ? String(person.id)
          : null,
    person,
  };
}

/** POST/PUT users devuelven `{ success, user }`; GET devuelve el usuario plano. */
function extractUserPayload(data: Record<string, unknown>): unknown {
  if (data.user && typeof data.user === "object" && !Array.isArray(data.user)) {
    return data.user;
  }
  return data;
}

export class UserRequest {
  static async findAll(
    _searchQuery?: string,
  ): Promise<
    { success: true; users: UserListItem[] } | { success: false; error: string; users: [] }
  > {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("users"), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        const t = await res.text();
        return { success: false, error: t || res.statusText, users: [] };
      }
      const json = (await res.json()) as unknown;
      let raw: unknown[] = [];
      if (Array.isArray(json)) {
        raw = json;
      } else if (json && typeof json === "object" && "data" in json && Array.isArray((json as { data: unknown }).data)) {
        raw = (json as { data: unknown[] }).data;
      } else {
        return { success: true, users: [] };
      }
      const users = raw
        .map((r) => toListItem(r))
        .filter((u): u is UserListItem => u != null);
      return { success: true, users };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al listar usuarios";
      return { success: false, error: err, users: [] };
    }
  }

  static async create(body: {
    userName: string;
    mail: string;
    password: string;
    rol: string;
    personId?: string;
    person?: {
      type?: string;
      firstName: string;
      lastName?: string;
      documentType?: string;
      documentNumber: string;
      email?: string;
      phone?: string;
    };
    alsoAsEmployee?: {
      branchId?: string;
      employmentType?: string;
      hireDate: string;
      baseSalary?: string;
    };
  }): Promise<
    { success: true; data: UserListItem } | { success: false; error: string }
  > {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("users"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          userName: body.userName.trim(),
          mail: body.mail.trim(),
          password: body.password,
          rol: body.rol,
          personId: body.personId,
          person: body.person,
          alsoAsEmployee: body.alsoAsEmployee,
        }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const msg =
          typeof data.message === "string"
            ? data.message
            : Array.isArray(data.message)
              ? String(data.message[0])
              : typeof data.error === "string"
                ? data.error
                : res.statusText;
        return { success: false, error: msg || "No se pudo crear el usuario" };
      }
      const item = toListItem(extractUserPayload(data));
      if (item) {
        return { success: true, data: item };
      }
      return { success: false, error: "Respuesta inesperada al crear usuario" };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al crear usuario";
      return { success: false, error: err };
    }
  }

  static async update(
    id: string,
    body: {
      userName: string;
      mail: string;
      rol: string;
      personName: string | null;
      phone: string | null;
      personDni: string | null;
      personId?: string | null;
    },
  ): Promise<
    { success: true; data: UserListItem } | { success: false; error: string }
  > {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`users/${encodeURIComponent(id)}`), {
        method: "PUT",
        headers,
        body: JSON.stringify({
          userName: body.userName.trim(),
          mail: body.mail.trim(),
          rol: body.rol,
          personName: body.personName && body.personName.trim() ? body.personName.trim() : undefined,
          phone: body.phone && body.phone.trim() ? body.phone.trim() : undefined,
          personDni: body.personDni && body.personDni.trim() ? body.personDni.trim() : undefined,
          personId: body.personId?.trim() || undefined,
        }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const msg =
          typeof data.message === "string"
            ? data.message
            : Array.isArray(data.message)
              ? String((data.message as string[])[0])
              : res.statusText;
        return { success: false, error: msg || "No se pudo actualizar el usuario" };
      }
      const item = toListItem(extractUserPayload(data));
      if (item) {
        return { success: true, data: item };
      }
      return { success: false, error: "Respuesta inesperada al actualizar" };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al actualizar usuario";
      return { success: false, error: err };
    }
  }

  static async remove(
    id: string,
  ): Promise<{ success: true } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl(`users/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        const t = await res.text();
        return { success: false, error: t || res.statusText };
      }
      return { success: true };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al eliminar usuario";
      return { success: false, error: err };
    }
  }
}
