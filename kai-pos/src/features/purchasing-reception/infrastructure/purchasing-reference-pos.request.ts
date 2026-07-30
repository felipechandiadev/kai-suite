import { apiUrl, authHeaders } from "./api-auth";
import type { SupplierGridRow } from "../types/supplier.types";
import type {
  StorageListItem,
  StorageType,
  StorageCategory,
} from "../types/storage.types";
import { STORAGE_CATEGORIES, STORAGE_TYPES } from "../types/storage.types";
import type { TaxListItem, TaxType } from "../types/tax.types";
import { TAX_TYPES } from "../types/tax.types";
import type { CompanyBankAccountItem, CompanyDetails } from "../types/company.types";

function normalizeSupplierRow(raw: unknown): SupplierGridRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  if (!id) return null;
  return raw as SupplierGridRow;
}

function isStorageType(v: string): v is StorageType {
  return (STORAGE_TYPES as readonly string[]).includes(v);
}

function isStorageCategory(v: string): v is StorageCategory {
  return (STORAGE_CATEGORIES as readonly string[]).includes(v);
}

function normalizeStorage(row: unknown): StorageListItem | null {
  if (!row || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  const name = o.name != null ? String(o.name) : "";
  const typeRaw = o.type != null ? String(o.type) : "";
  const catRaw = o.category != null ? String(o.category) : "";
  if (!id || !name) {
    return null;
  }
  const type: StorageType = isStorageType(typeRaw) ? typeRaw : "WAREHOUSE";
  const category: StorageCategory = isStorageCategory(catRaw) ? catRaw : "IN_BRANCH";
  const branchRaw = o.branch;
  let branch: { id: string; name: string } | null = null;
  if (branchRaw && typeof branchRaw === "object") {
    const b = branchRaw as Record<string, unknown>;
    const bid = b.id != null ? String(b.id) : "";
    const bname = b.name != null ? String(b.name) : "";
    if (bid && bname) branch = { id: bid, name: bname };
  }
  const cap = o.capacity;
  const capacity =
    cap == null || cap === ""
      ? null
      : typeof cap === "number"
        ? cap
        : Number(cap);

  return {
    id,
    name,
    code: o.code != null && String(o.code).trim() ? String(o.code).trim() : null,
    type,
    category,
    branchId: o.branchId != null && String(o.branchId) ? String(o.branchId) : null,
    branch,
    address: o.address != null && String(o.address).trim() ? String(o.address).trim() : null,
    location: o.location ?? null,
    capacity: capacity != null && Number.isFinite(capacity) ? capacity : null,
    isDefault: o.isDefault === true,
    isActive: o.isActive !== false,
    createdAt: o.createdAt != null ? String(o.createdAt) : undefined,
    updatedAt: o.updatedAt != null ? String(o.updatedAt) : undefined,
  };
}

function isTaxType(v: string): v is TaxType {
  return (TAX_TYPES as readonly string[]).includes(v);
}

function normalizeTax(row: unknown): TaxListItem | null {
  if (!row || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  const companyId = o.companyId != null ? String(o.companyId) : "";
  const name = o.name != null ? String(o.name) : "";
  const typeRaw = o.taxType != null ? String(o.taxType) : "";
  if (!id || !name || !isTaxType(typeRaw)) {
    return null;
  }
  const companyIdNorm = companyId || id;
  const rateRaw = o.rate;
  const rate =
    typeof rateRaw === "number"
      ? rateRaw
      : rateRaw != null && String(rateRaw) !== ""
        ? Number(rateRaw)
        : 0;

  return {
    id,
    companyId: companyIdNorm,
    name,
    code: o.code != null && String(o.code).trim() ? String(o.code).trim() : null,
    taxType: typeRaw,
    rate: Number.isFinite(rate) ? rate : 0,
    description:
      o.description != null && String(o.description).trim() ? String(o.description).trim() : null,
    isDefault: o.isDefault === true,
    isActive: o.isActive !== false,
    nonDeletable: o.nonDeletable === true,
    createdAt: o.createdAt != null ? String(o.createdAt) : undefined,
    updatedAt: o.updatedAt != null ? String(o.updatedAt) : undefined,
  };
}

export class PurchasingReferencePosRequest {
  static async listSuppliers(): Promise<SupplierGridRow[]> {
    const headers = await authHeaders();
    const res = await fetch(apiUrl("suppliers?limit=500&offset=0"), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = (await res.json()) as Record<string, unknown>;
    const dataRaw = json.data;
    const data = Array.isArray(dataRaw) ? dataRaw : [];
    return data.map(normalizeSupplierRow).filter((x): x is SupplierGridRow => x != null);
  }

  static async listStorages(): Promise<StorageListItem[]> {
    const headers = await authHeaders();
    const res = await fetch(apiUrl("storages?includeInactive=true"), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = (await res.json()) as unknown;
    if (!Array.isArray(json)) return [];
    return json.map(normalizeStorage).filter((x): x is StorageListItem => x != null);
  }

  static async listTaxes(): Promise<TaxListItem[]> {
    const headers = await authHeaders();
    const res = await fetch(apiUrl("taxes?includeInactive=true"), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = (await res.json()) as unknown;
    if (!Array.isArray(json)) return [];
    return json.map(normalizeTax).filter((x): x is TaxListItem => x != null);
  }

  static async getCompanyBankAccounts(): Promise<CompanyBankAccountItem[]> {
    const d = await this.getCompanyDetails();
    return d?.bankAccounts ?? [];
  }

  static async getCompanyDetails(): Promise<CompanyDetails | null> {
    const headers = await authHeaders();
    const res = await fetch(apiUrl("company"), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!json || typeof json !== "object") return null;
    const idRaw = json.id != null ? String(json.id).trim() : "";
    return {
      ...(json as CompanyDetails),
      id: idRaw || (json as CompanyDetails).id || null,
    };
  }
}
