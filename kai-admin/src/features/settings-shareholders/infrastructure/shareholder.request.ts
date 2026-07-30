import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { CreateShareholderInput, ShareholderRow } from "../types/shareholder.types";

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

function normalizeRow(raw: unknown): ShareholderRow | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  const companyId = o.companyId != null ? String(o.companyId) : "";
  const personId = o.personId != null ? String(o.personId) : "";
  if (!id || !companyId || !personId) {
    return null;
  }
  const personRaw = o.person;
  let person: ShareholderRow["person"];
  if (personRaw && typeof personRaw === "object") {
    const p = personRaw as Record<string, unknown>;
    person = {
      id: p.id != null ? String(p.id) : personId,
      firstName: p.firstName != null ? String(p.firstName) : undefined,
      lastName: p.lastName != null ? String(p.lastName) : undefined,
      businessName: p.businessName != null ? String(p.businessName) : null,
      documentType: p.documentType != null ? String(p.documentType) : undefined,
      documentNumber: p.documentNumber != null ? String(p.documentNumber) : null,
      displayName: p.displayName != null ? String(p.displayName) : undefined,
    };
  }
  return {
    id,
    companyId,
    personId,
    ownershipPercentage:
      typeof o.ownershipPercentage === "number" && Number.isFinite(o.ownershipPercentage)
        ? o.ownershipPercentage
        : o.ownershipPercentage != null
          ? Number(o.ownershipPercentage)
          : null,
    partnerType: o.partnerType != null ? String(o.partnerType) : null,
    joinDate: o.joinDate != null ? String(o.joinDate).slice(0, 10) : null,
    notes: o.notes != null ? String(o.notes) : null,
    isActive: o.isActive !== false,
    person,
  };
}

export class ShareholderRequest {
  static async list(companyId: string): Promise<ShareholderRow[]> {
    const headers = await authHeaders();
    const q = new URLSearchParams({ companyId });
    const res = await fetch(apiUrl(`shareholders?${q.toString()}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      return [];
    }
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) {
      return [];
    }
    return data.map(normalizeRow).filter((x): x is ShareholderRow => x != null);
  }

  static async create(body: CreateShareholderInput): Promise<ShareholderRow> {
    const headers = await authHeaders();
    const res = await fetch(apiUrl("shareholders"), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `HTTP ${res.status}`);
    }
    const raw = await res.json();
    const row = normalizeRow(raw);
    if (!row) {
      throw new Error("Respuesta inválida al crear socio");
    }
    return row;
  }

  static async remove(companyId: string, id: string): Promise<void> {
    const headers = await authHeaders();
    const q = new URLSearchParams({ companyId });
    const res = await fetch(apiUrl(`shareholders/${encodeURIComponent(id)}?${q.toString()}`), {
      method: "DELETE",
      headers,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `HTTP ${res.status}`);
    }
  }
}
