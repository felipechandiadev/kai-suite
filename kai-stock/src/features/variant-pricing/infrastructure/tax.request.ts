import { apiUrl, authHeaders } from "@/lib/auth/auth-headers";
import type { TaxListItem, TaxType } from "../types/tax.types";
import { TAX_TYPES } from "../types/tax.types";

function isTaxType(v: string): v is TaxType {
  return (TAX_TYPES as readonly string[]).includes(v);
}

function normalizeTax(row: unknown): TaxListItem | null {
  if (!row || typeof row !== "object") {
    return null;
  }
  const o = row as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  const companyId = o.companyId != null ? String(o.companyId) : "";
  const name = o.name != null ? String(o.name) : "";
  const typeRaw = o.taxType != null ? String(o.taxType) : "";
  if (!id || !companyId || !name || !isTaxType(typeRaw)) {
    return null;
  }
  const rateRaw = o.rate;
  const rate =
    typeof rateRaw === "number"
      ? rateRaw
      : rateRaw != null && String(rateRaw) !== ""
        ? Number(rateRaw)
        : 0;
  return {
    id,
    companyId,
    name,
    code: o.code != null && String(o.code).trim() ? String(o.code).trim() : null,
    taxType: typeRaw,
    rate: Number.isFinite(rate) ? rate : 0,
    description: o.description != null && String(o.description).trim() ? String(o.description).trim() : null,
    isDefault: o.isDefault === true,
    isActive: o.isActive !== false,
  };
}

export class TaxRequest {
  static async findAll(): Promise<
    { success: true; taxes: TaxListItem[] } | { success: false; error: string }
  > {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("taxes?includeInactive=true"), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        const msg =
          typeof data.message === "string" && data.message.trim()
            ? data.message.trim()
            : res.statusText;
        return { success: false, error: msg };
      }
      const json = (await res.json()) as unknown;
      const rows = Array.isArray(json) ? json : [];
      const taxes = rows.map(normalizeTax).filter((x): x is TaxListItem => x != null);
      return { success: true, taxes };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al listar impuestos",
      };
    }
  }
}
