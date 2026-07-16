import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  SupplierGridRow,
  SupplierPersonBankAccount,
  SupplierPersonGrid,
  SupplierDetailView,
  PersonGeoFields,
  UpdateSupplierPayload,
} from "../types/supplier.types";
import type { PersonEconomicActivity } from "@kai/chile-catalogs";

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

function mapEconomicActivities(raw: unknown): PersonEconomicActivity[] | null {
  if (!Array.isArray(raw)) return null;
  const out: PersonEconomicActivity[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const code = o.code != null ? String(o.code).trim() : "";
    if (!code) continue;
    out.push({
      code,
      name: o.name != null ? String(o.name) : code,
      category: o.category === "SEGUNDA" ? "SEGUNDA" : "PRIMERA",
      ivaAffected: o.ivaAffected === true,
      isActive: o.isActive === true,
    });
  }
  return out.length > 0 ? out : null;
}

function mapPersonGeoFields(o: Record<string, unknown>): PersonGeoFields {
  return {
    regionCode: o.regionCode != null && String(o.regionCode).trim() ? String(o.regionCode) : null,
    regionName: o.regionName != null && String(o.regionName).trim() ? String(o.regionName) : null,
    communeCode: o.communeCode != null && String(o.communeCode).trim() ? String(o.communeCode) : null,
    communeName: o.communeName != null && String(o.communeName).trim() ? String(o.communeName) : null,
    treasuryCode: o.treasuryCode != null && String(o.treasuryCode).trim() ? String(o.treasuryCode) : null,
    economicActivities: mapEconomicActivities(o.economicActivities),
  };
}

function normalizePersonBankAccounts(raw: unknown): SupplierPersonBankAccount[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: SupplierPersonBankAccount[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const o = row as Record<string, unknown>;
    const bankName = o.bankName != null ? String(o.bankName) : "";
    const accountType = o.accountType != null ? String(o.accountType) : "";
    const accountNumber = o.accountNumber != null ? String(o.accountNumber) : "";
    if (!bankName || !accountNumber) {
      continue;
    }
    out.push({
      accountKey: o.accountKey != null ? String(o.accountKey) : undefined,
      bankName,
      accountType,
      accountNumber,
      accountHolderName: o.accountHolderName != null ? String(o.accountHolderName) : undefined,
      isPrimary: o.isPrimary === true,
      notes: o.notes != null ? String(o.notes) : undefined,
    });
  }
  return out;
}

function normalizePerson(raw: unknown): SupplierPersonGrid | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const p = raw as Record<string, unknown>;
  const id = p.id != null ? String(p.id) : "";
  if (!id) {
    return null;
  }
  return {
    id,
    type: (p.type === "COMPANY" ? "COMPANY" : "NATURAL") as SupplierPersonGrid["type"],
    firstName: p.firstName != null ? String(p.firstName) : "",
    lastName: p.lastName != null && String(p.lastName).trim() ? String(p.lastName) : null,
    businessName: p.businessName != null && String(p.businessName).trim() ? String(p.businessName) : null,
    documentType: p.documentType != null ? String(p.documentType) : null,
    documentNumber: p.documentNumber != null && String(p.documentNumber).trim() ? String(p.documentNumber) : null,
    email: p.email != null && String(p.email).trim() ? String(p.email) : null,
    phone: p.phone != null && String(p.phone).trim() ? String(p.phone) : null,
    address: p.address != null && String(p.address).trim() ? String(p.address) : null,
    bankAccounts: normalizePersonBankAccounts(p.bankAccounts),
    ...mapPersonGeoFields(p),
  };
}

function normalizeSupplier(row: unknown): SupplierGridRow | null {
  if (!row || typeof row !== "object") {
    return null;
  }
  const o = row as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  if (!id) {
    return null;
  }
  return {
    id,
    alias: o.alias != null && String(o.alias).trim() ? String(o.alias) : null,
    supplierType: o.supplierType != null ? String(o.supplierType) : "DISTRIBUTOR",
    defaultPaymentTermDays:
      typeof o.defaultPaymentTermDays === "number" && Number.isFinite(o.defaultPaymentTermDays)
        ? o.defaultPaymentTermDays
        : Number(o.defaultPaymentTermDays) || 0,
    isActive: o.isActive !== false,
    notes: o.notes != null && String(o.notes).trim() ? String(o.notes) : null,
    person: normalizePerson(o.person),
  };
}

function mapSupplierDetail(raw: Record<string, unknown>): SupplierDetailView | null {
  const row = normalizeSupplier(raw);
  if (!row) {
    return null;
  }
  const personId =
    raw.personId != null && String(raw.personId).trim()
      ? String(raw.personId).trim()
      : row.person?.id || "";
  if (!personId) {
    return null;
  }
  return {
    ...row,
    personId,
    createdAt: raw.createdAt != null ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt != null ? String(raw.updatedAt) : undefined,
  };
}

function parseHttpErrorMessage(data: Record<string, unknown>): string {
  const m = data.message;
  if (Array.isArray(m)) {
    return m.map((x) => String(x)).join("; ");
  }
  if (typeof m === "string" && m.trim()) {
    return m.trim();
  }
  if (typeof data.error === "string" && data.error.trim()) {
    return data.error.trim();
  }
  return "No se pudo guardar los cambios.";
}

export class SupplierRequest {
  static async list(limit = 200, offset = 0): Promise<{ rows: SupplierGridRow[]; total: number }> {
    const headers = await authHeaders();
    const q = new URLSearchParams();
    q.set("limit", String(Math.min(500, Math.max(1, limit))));
    q.set("offset", String(Math.max(0, offset)));
    try {
      const res = await fetch(apiUrl(`suppliers?${q.toString()}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        return { rows: [], total: 0 };
      }
      const json = (await res.json()) as unknown;
      if (!json || typeof json !== "object") {
        return { rows: [], total: 0 };
      }
      const body = json as Record<string, unknown>;
      const dataRaw = body.data;
      const data = Array.isArray(dataRaw) ? dataRaw : [];
      const total =
        typeof body.total === "number" && Number.isFinite(body.total) ? body.total : data.length;
      const rows = data.map(normalizeSupplier).filter((x): x is SupplierGridRow => x != null);
      return { rows, total };
    } catch {
      return { rows: [], total: 0 };
    }
  }

  static async create(body: {
    person?: Record<string, unknown>;
    personId?: string;
    supplierType?: string;
    alias?: string | null;
    defaultPaymentTermDays?: number;
    notes?: string | null;
  }): Promise<{ success: true; id: string } | { success: false; error: string }> {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("suppliers"), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const m = data.message;
        const msg = Array.isArray(m)
          ? m.map(String).join("; ")
          : typeof m === "string" && m.trim()
            ? m.trim()
            : res.statusText;
        return { success: false, error: msg };
      }
      const supplier = data as Record<string, unknown> | undefined;
      const id =
        supplier && supplier.id != null
          ? String(supplier.id)
          : data.id != null
            ? String(data.id)
            : "";
      if (!id) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, id };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al crear proveedor";
      return { success: false, error: err };
    }
  }

  static async getById(supplierId: string): Promise<SupplierDetailView | null> {
    const id = supplierId?.trim();
    if (!id) {
      return null;
    }
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`suppliers/${encodeURIComponent(id)}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      return null;
    }
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!json || typeof json !== "object") {
      return null;
    }
    return mapSupplierDetail(json);
  }

  static async update(
    supplierId: string,
    body: UpdateSupplierPayload,
  ): Promise<{ success: true; supplier: SupplierDetailView } | { success: false; error: string }> {
    const id = supplierId?.trim();
    if (!id) {
      return { success: false, error: "Proveedor no especificado." };
    }
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`suppliers/${encodeURIComponent(id)}`), {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return { success: false, error: parseHttpErrorMessage(data) };
    }
    const mapped = mapSupplierDetail(data);
    if (!mapped) {
      return { success: false, error: "Respuesta inválida del servidor." };
    }
    return { success: true, supplier: mapped };
  }
}
