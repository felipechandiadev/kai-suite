import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { throwIfUnauthorizedStatus, isUnauthorizedSessionError } from "@/lib/auth/unauthorized-session";

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) {
    throw new Error("BACKEND_API_URL no está definida");
  }
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function authHeaders(): Promise<HeadersInit | null> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  if (token == null || String(token).trim() === "") {
    return null;
  }
  const activeCompanyId = (session?.user as any)?.activeCompanyId as string | null | undefined;
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (activeCompanyId) {
    h["X-Active-Company-Id"] = activeCompanyId;
  }
  return h;
}

async function errorBodyMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const data = text ? (JSON.parse(text) as Record<string, unknown>) : null;
    const m = data?.message;
    if (Array.isArray(m)) {
      return m.map(String).join("; ");
    }
    if (typeof m === "string" && m.trim()) {
      return m.trim();
    }
  } catch {
    // ignore
  }
  return text.trim() || `HTTP ${res.status}`;
}

export type CurrentCompany = {
  /** Puede ser `null` si el backend no tiene empresa en BD (placeholder de nombre sin uuid). */
  id: string | null;
  razonSocial: string;
  isActive?: boolean;
};

export type CompanyBankAccountItem = {
  accountKey?: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  accountHolderName?: string;
  accountHolderRut?: string;
  isPrimary?: boolean;
  notes?: string;
  currentBalance?: number;
};

/** Respuesta de GET /api/company según el backend, para visualización. */
export type CompanyDetails = {
  id: string | null;
  razonSocial: string;
  nombreFantasia: string | null;
  businessActivity: string | null;
  rut: string | null;
  address: string | null;
  commune: string | null;
  city: string | null;
  siiResolutionNumber: string | null;
  siiResolutionDate: string | null;
  mail: string | null;
  phone: string | null;
  defaultCurrency: string;
  /** ISO 8601 o `null` */
  fiscalYearStart: string | null;
  isActive: boolean;
  settings: Record<string, unknown>;
  bankAccounts: CompanyBankAccountItem[];
};

export type UpdateCompanyGeneralInput = {
  razonSocial?: string;
  nombreFantasia?: string;
  businessActivity?: string;
  rut?: string;
  address?: string | null;
};

export type AddCompanyBankAccountInput = {
  bankName: string;
  accountType: string;
  accountNumber: string;
  accountHolderName?: string;
  accountHolderRut?: string;
  isPrimary?: boolean;
  notes?: string;
};

type CompanyApiResponse = {
  id?: string | null;
  razonSocial?: string;
  nombreFantasia?: string | null;
  businessActivity?: string | null;
  rut?: string | null;
  address?: string | null;
  commune?: string | null;
  city?: string | null;
  siiResolutionNumber?: string | null;
  siiResolutionDate?: string | null;
  mail?: string | null;
  phone?: string | null;
  defaultCurrency?: string;
  fiscalYearStart?: string | null;
  isActive?: boolean;
  settings?: Record<string, unknown> | null;
  bankAccounts?: unknown[] | null;
};

function isUuidString(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s.trim());
}

function parseFiscalYearStart(raw: string | null | undefined): string | null {
  if (raw == null || String(raw).trim() === "") {
    return null;
  }
  const s = String(raw);
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return s;
}

function normalizeBankAccounts(raw: unknown): CompanyBankAccountItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: CompanyBankAccountItem[] = [];
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
      accountHolderRut: o.accountHolderRut != null ? String(o.accountHolderRut) : undefined,
      isPrimary: o.isPrimary === true,
      notes: o.notes != null ? String(o.notes) : undefined,
      currentBalance: typeof o.currentBalance === "number" ? o.currentBalance : undefined,
    });
  }
  return out;
}

function mapCompanyResponse(data: CompanyApiResponse): CompanyDetails | null {
  if (data?.razonSocial == null) {
    return null;
  }
  const rawId = data.id != null && String(data.id).trim() !== "" ? String(data.id).trim() : null;
  const id = rawId && isUuidString(rawId) ? rawId : null;
  return {
    id,
    razonSocial: data.razonSocial,
    nombreFantasia:
      data.nombreFantasia != null && String(data.nombreFantasia).trim() !== "" ? String(data.nombreFantasia) : null,
    businessActivity:
      data.businessActivity != null && String(data.businessActivity).trim() !== ""
        ? String(data.businessActivity)
        : null,
    rut: data.rut != null && String(data.rut).trim() !== "" ? String(data.rut) : null,
    address:
      data.address != null && String(data.address).trim() !== "" ? String(data.address).trim() : null,
    commune:
      data.commune != null && String(data.commune).trim() !== "" ? String(data.commune).trim() : null,
    city: data.city != null && String(data.city).trim() !== "" ? String(data.city).trim() : null,
    siiResolutionNumber:
      data.siiResolutionNumber != null && String(data.siiResolutionNumber).trim() !== ""
        ? String(data.siiResolutionNumber).trim()
        : null,
    siiResolutionDate: parseFiscalYearStart(
      data.siiResolutionDate != null ? String(data.siiResolutionDate) : null,
    ),
    mail: data.mail != null && String(data.mail).trim() !== "" ? String(data.mail).trim() : null,
    phone: data.phone != null && String(data.phone).trim() !== "" ? String(data.phone).trim() : null,
    defaultCurrency: data.defaultCurrency != null && String(data.defaultCurrency).trim() !== "" ? String(data.defaultCurrency) : "CLP",
    fiscalYearStart: parseFiscalYearStart(data.fiscalYearStart != null ? String(data.fiscalYearStart) : null),
    isActive: data.isActive !== false,
    settings: data.settings && typeof data.settings === "object" && !Array.isArray(data.settings) ? data.settings : {},
    bankAccounts: normalizeBankAccounts(data.bankAccounts),
  };
}

export class CompanyRequest {
  /** Detalle de la empresa (primera activa en BD), según backend. */
  static async getDetails(): Promise<CompanyDetails | null> {
    const headers = await authHeaders();
    if (!headers) {
      return null;
    }
    try {
      const res = await fetch(apiUrl("company"), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (res.status === 401) {
        const detail = await errorBodyMessage(res).catch(() => "");
        throwIfUnauthorizedStatus(401, detail || undefined);
      }
      if (!res.ok) {
        return null;
      }
      const data = (await res.json()) as CompanyApiResponse;
      return mapCompanyResponse(data);
    } catch (e) {
      if (isUnauthorizedSessionError(e)) {
        throw e;
      }
      return null;
    }
  }

  static async patchGeneral(input: UpdateCompanyGeneralInput): Promise<CompanyDetails> {
    const headers = await authHeaders();
    if (!headers) {
      throw new Error("Sesión no autenticada");
    }
    const res = await fetch(apiUrl("company"), {
      method: "PATCH",
      headers,
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      throw new Error(await errorBodyMessage(res));
    }
    const data = (await res.json()) as CompanyApiResponse;
    const mapped = mapCompanyResponse(data);
    if (!mapped) {
      throw new Error("Respuesta de empresa inválida");
    }
    return mapped;
  }

  static async addBankAccount(input: AddCompanyBankAccountInput): Promise<CompanyDetails> {
    const headers = await authHeaders();
    if (!headers) {
      throw new Error("Sesión no autenticada");
    }
    const res = await fetch(apiUrl("company/bank-accounts"), {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      throw new Error(await errorBodyMessage(res));
    }
    const data = (await res.json()) as CompanyApiResponse;
    const mapped = mapCompanyResponse(data);
    if (!mapped) {
      throw new Error("Respuesta de empresa inválida");
    }
    return mapped;
  }

  static async getBankAccountBookBalance(accountKey: string): Promise<{ bookBalance: number }> {
    const headers = await authHeaders();
    if (!headers) {
      throw new Error("Sesión no autenticada");
    }
    const res = await fetch(apiUrl(`company/bank-accounts/${encodeURIComponent(accountKey)}/balance`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(await errorBodyMessage(res));
    }
    const data = (await res.json()) as { bookBalance: number };
    return { bookBalance: typeof data.bookBalance === "number" ? data.bookBalance : 0 };
  }

  static async updateBankAccountBalance(accountKey: string, currentBalance: number): Promise<void> {
    const headers = await authHeaders();
    if (!headers) {
      throw new Error("Sesión no autenticada");
    }
    const res = await fetch(
      apiUrl(`company/bank-accounts/${encodeURIComponent(accountKey)}/balance`),
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ currentBalance }),
      },
    );
    if (!res.ok) {
      throw new Error(await errorBodyMessage(res));
    }
  }

  /** Empresa activa (alias reducido para flujos que solo requieren id/nombre). */
  static async getCurrent(): Promise<CurrentCompany | null> {
    const details = await this.getDetails();
    if (!details) {
      return null;
    }
    return {
      id: details.id,
      razonSocial: details.razonSocial,
      isActive: details.isActive,
    };
  }
}
