import { resolveCompanyPhone } from "@kai/document-print";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";

export type CompanyDetails = {
  id: string | null;
  razonSocial: string;
  nombreFantasia: string | null;
  /** RUT u otro identificador fiscal si el backend lo envía. */
  rut?: string | null;
  businessActivity?: string | null;
  defaultCurrency?: string | null;
  address?: string | null;
  mail?: string | null;
  /** Teléfono de contacto de la empresa. */
  phone?: string | null;
  /**
   * URL de logo de marca (absoluta o relativa al dominio del POS).
   * Se intenta leer desde `settings` del backend (`logoUrl`, `posLogoUrl`, `brand.logoUrl`).
   */
  logoUrl?: string | null;
  bankAccounts: Array<{
    accountKey?: string;
    bankName: string;
    accountType: string;
    accountNumber: string;
    accountHolderName?: string;
    accountHolderRut?: string;
    isPrimary?: boolean;
    notes?: string;
  }>;
};

type CompanyApiResponse = {
  id?: string | null;
  razonSocial?: string;
  nombreFantasia?: string | null;
  rut?: string | null;
  businessActivity?: string | null;
  defaultCurrency?: string | null;
  address?: string | null;
  mail?: string | null;
  phone?: string | null;
  settings?: unknown;
  bankAccounts?: unknown[] | null;
};

function extractCompanyLogoUrl(settings: unknown): string | null {
  if (!settings || typeof settings !== "object") return null;
  const s = settings as Record<string, unknown>;
  const pick = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return (
    pick(s.logoUrl) ??
    pick(s.posLogoUrl) ??
    (() => {
      const brand = s.brand;
      if (!brand || typeof brand !== "object") return null;
      return pick((brand as Record<string, unknown>).logoUrl);
    })()
  );
}

function normalizeBankAccounts(raw: unknown): CompanyDetails["bankAccounts"] {
  if (!Array.isArray(raw)) return [];
  const out: CompanyDetails["bankAccounts"] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const bankName = o.bankName != null ? String(o.bankName) : "";
    const accountType = o.accountType != null ? String(o.accountType) : "";
    const accountNumber = o.accountNumber != null ? String(o.accountNumber) : "";
    if (!bankName || !accountNumber) continue;
    out.push({
      accountKey: o.accountKey != null ? String(o.accountKey) : undefined,
      bankName,
      accountType,
      accountNumber,
      accountHolderName: o.accountHolderName != null ? String(o.accountHolderName) : undefined,
      accountHolderRut: o.accountHolderRut != null ? String(o.accountHolderRut) : undefined,
      isPrimary: o.isPrimary === true,
      notes: o.notes != null ? String(o.notes) : undefined,
    });
  }
  return out;
}

export class CompanyRequest {
  static async getDetails(): Promise<CompanyDetails | null> {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      throw new Error("BACKEND_API_URL is not set");
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const activeCompanyId = (session?.user as any)?.activeCompanyId as string | null | undefined;
    if (!token) {
      return null;
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;
      const res = await fetch(`${base}/api/company`, {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        return null;
      }

      const data = (await res.json()) as CompanyApiResponse;
      if (!data?.razonSocial) {
        return null;
      }

      const rut =
        data.rut != null && String(data.rut).trim() !== "" ? String(data.rut).trim() : null;
      const businessActivity =
        data.businessActivity != null && String(data.businessActivity).trim() !== ""
          ? String(data.businessActivity).trim()
          : null;
      const defaultCurrency =
        data.defaultCurrency != null && String(data.defaultCurrency).trim() !== ""
          ? String(data.defaultCurrency).trim()
          : null;
      const address =
        data.address != null && String(data.address).trim() !== ""
          ? String(data.address).trim()
          : null;
      const mail =
        data.mail != null && String(data.mail).trim() !== "" ? String(data.mail).trim() : null;

      return {
        id: data.id != null && String(data.id).trim() !== "" ? String(data.id).trim() : null,
        razonSocial: String(data.razonSocial),
        nombreFantasia:
          data.nombreFantasia != null && String(data.nombreFantasia).trim() !== ""
            ? String(data.nombreFantasia).trim()
            : null,
        rut,
        businessActivity,
        defaultCurrency,
        address,
        mail,
        phone: resolveCompanyPhone({ phone: data.phone, settings: data.settings }),
        logoUrl: extractCompanyLogoUrl(data.settings),
        bankAccounts: normalizeBankAccounts(data.bankAccounts),
      };
    } catch {
      return null;
    }
  }
}

