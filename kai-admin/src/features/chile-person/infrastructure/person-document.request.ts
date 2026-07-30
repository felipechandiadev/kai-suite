import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  PersonDocumentLookupData,
  PersonDocumentLookupResult,
  PersonDocumentPerson,
  PersonDocumentRoles,
} from "../types/person-document-lookup.types";

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

function normalizePerson(raw: unknown): PersonDocumentPerson | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  const firstName = o.firstName != null ? String(o.firstName) : "";
  if (!id || !firstName) return null;
  return {
    id,
    type: o.type != null ? String(o.type) : "NATURAL",
    firstName,
    lastName: o.lastName != null ? String(o.lastName) : null,
    businessName: o.businessName != null ? String(o.businessName) : null,
    documentType: o.documentType != null ? String(o.documentType) : null,
    documentNumber: o.documentNumber != null ? String(o.documentNumber) : null,
    email: o.email != null ? String(o.email) : null,
    phone: o.phone != null ? String(o.phone) : null,
    address: o.address != null ? String(o.address) : null,
    regionCode: o.regionCode != null ? String(o.regionCode) : null,
    regionName: o.regionName != null ? String(o.regionName) : null,
    communeCode: o.communeCode != null ? String(o.communeCode) : null,
    communeName: o.communeName != null ? String(o.communeName) : null,
    treasuryCode: o.treasuryCode != null ? String(o.treasuryCode) : null,
    activityStarted: o.activityStarted === true,
    economicActivities: o.economicActivities ?? null,
  };
}

function normalizeRoleRef(raw: unknown): PersonDocumentRoles["customer"] {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  if (!id) return null;
  return {
    id,
    isActive: o.isActive === undefined ? undefined : o.isActive === true,
    status: o.status != null ? String(o.status) : undefined,
    userName: o.userName != null ? String(o.userName) : undefined,
    rol: o.rol != null ? String(o.rol) : undefined,
  };
}

function normalizeRoles(raw: unknown): PersonDocumentRoles {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    customer: normalizeRoleRef(o.customer),
    supplier: normalizeRoleRef(o.supplier),
    employee: normalizeRoleRef(o.employee),
    user: normalizeRoleRef(o.user),
  };
}

export async function lookupPersonByDocumentRequest(params: {
  documentNumber: string;
  documentType?: string;
  excludePersonId?: string;
}): Promise<PersonDocumentLookupResult> {
  const documentNumber = params.documentNumber.trim();
  if (!documentNumber) {
    return { success: false, error: "Indique un número de documento." };
  }
  const qs = new URLSearchParams({ documentNumber });
  if (params.documentType?.trim()) qs.set("documentType", params.documentType.trim());
  if (params.excludePersonId?.trim()) qs.set("excludePersonId", params.excludePersonId.trim());

  try {
    const res = await fetch(apiUrl(`/persons/by-document?${qs}`), {
      method: "GET",
      headers: await authHeaders(),
      cache: "no-store",
    });
    const json = (await res.json()) as {
      success?: boolean;
      data?: unknown;
      message?: string;
    };
    if (!res.ok || json.success !== true) {
      return {
        success: false,
        error: json.message != null ? String(json.message) : `Error ${res.status}`,
      };
    }
    const raw = json.data as Record<string, unknown> | null;
    if (!raw || typeof raw !== "object") {
      return { success: false, error: "Respuesta inválida del servidor." };
    }
    const found = raw.found === true;
    const data: PersonDocumentLookupData = { found };
    if (found) {
      const person = normalizePerson(raw.person);
      if (!person) {
        return { success: false, error: "Respuesta de persona inválida." };
      }
      data.person = person;
      data.roles = normalizeRoles(raw.roles);
    }
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error de red",
    };
  }
}
