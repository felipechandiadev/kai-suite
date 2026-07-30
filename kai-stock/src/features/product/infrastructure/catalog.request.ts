import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { apiFailure } from "@/lib/auth/api-response";
import { apiUrl, authHeaders } from "@/lib/auth/auth-headers";

type UnitRow = { id: string; active: boolean; isDefault: boolean; symbol: string };
type PriceListRow = { id: string; isActive: boolean; isDefault: boolean };
type TaxRow = {
  id: string;
  companyId: string;
  taxType: string;
  rate: number;
  isDefault: boolean;
  isActive: boolean;
};
type StorageRow = { id: string; isDefault: boolean; isActive: boolean };

function parseUnits(json: unknown): UnitRow[] {
  if (!Array.isArray(json)) return [];
  return json
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const id = o.id != null ? String(o.id) : "";
      if (!id) return null;
      return {
        id,
        active: o.active !== false,
        isDefault: o.isDefault === true,
        symbol: o.symbol != null ? String(o.symbol).trim() : "",
      };
    })
    .filter((x): x is UnitRow => x != null);
}

function parsePriceLists(json: unknown): PriceListRow[] {
  if (!Array.isArray(json)) return [];
  return json
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const id = o.id != null ? String(o.id) : "";
      if (!id) return null;
      return {
        id,
        isActive: o.isActive !== false,
        isDefault: o.isDefault === true,
      };
    })
    .filter((x): x is PriceListRow => x != null);
}

function parseTaxes(json: unknown): TaxRow[] {
  if (!Array.isArray(json)) return [];
  return json
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const id = o.id != null ? String(o.id) : "";
      const taxType = o.taxType != null ? String(o.taxType) : "";
      if (!id || !taxType) return null;
      const rateRaw = o.rate;
      const rate =
        typeof rateRaw === "number"
          ? rateRaw
          : rateRaw != null
            ? Number(rateRaw)
            : 0;
      return {
        id,
        companyId: o.companyId != null ? String(o.companyId) : "",
        taxType,
        rate: Number.isFinite(rate) ? rate : 0,
        isDefault: o.isDefault === true,
        isActive: o.isActive !== false,
      };
    })
    .filter((x): x is TaxRow => x != null);
}

export type CatalogDefaults = {
  unitId: string;
  priceListId: string;
  defaultStorageId: string;
  defaultIvaTaxIds: string[];
  taxes: TaxRow[];
  /** true cuando hay al menos un IVA activo aplicable */
  hasActiveIva: boolean;
};

function parseStorages(json: unknown): StorageRow[] {
  if (!json || typeof json !== "object") return [];
  const storagesRaw = (json as Record<string, unknown>).storages;
  if (!Array.isArray(storagesRaw)) return [];
  return storagesRaw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const id = o.id != null ? String(o.id) : "";
      if (!id) return null;
      return {
        id,
        isDefault: o.isDefault === true,
        isActive: o.isActive !== false,
      };
    })
    .filter((x): x is StorageRow => x != null);
}

function resolveDefaultIvaTaxIds(taxes: TaxRow[]): string[] {
  const iva = taxes.filter((t) => t.isActive && t.taxType === "IVA");
  const defaults = iva.filter((t) => t.isDefault).map((t) => t.id);
  if (defaults.length > 0) return defaults;
  return iva[0]?.id ? [iva[0].id] : [];
}

export class CatalogRequest {
  static async resolveDefaults(): Promise<
    | { success: true; defaults: CatalogDefaults }
    | { success: false; error: string; unauthorized?: boolean }
  > {
    const headers = await authHeaders();
    const session = await getServerSession(authOptions);
    const activeCompanyId =
      (session?.user as { activeCompanyId?: string | null } | undefined)?.activeCompanyId ??
      null;
    try {
      const [unitsRes, priceListsRes, taxesRes, filtersRes] = await Promise.all([
        fetch(apiUrl("units"), { method: "GET", headers, cache: "no-store" }),
        fetch(apiUrl("price-lists?includeInactive=true"), {
          method: "GET",
          headers,
          cache: "no-store",
        }),
        fetch(apiUrl("taxes"), { method: "GET", headers, cache: "no-store" }),
        fetch(apiUrl("inventory/filters"), { method: "GET", headers, cache: "no-store" }),
      ]);

      const unitsJson = (await unitsRes.json().catch(() => ({}))) as Record<string, unknown>;
      if (!unitsRes.ok) {
        return apiFailure(unitsRes, unitsJson);
      }
      const priceListsJson = (await priceListsRes.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!priceListsRes.ok) {
        return apiFailure(priceListsRes, priceListsJson);
      }
      const taxesJson = (await taxesRes.json().catch(() => ({}))) as Record<string, unknown>;
      if (!taxesRes.ok) {
        return apiFailure(taxesRes, taxesJson);
      }
      const filtersJson = (await filtersRes.json().catch(() => ({}))) as Record<string, unknown>;
      if (!filtersRes.ok) {
        return apiFailure(filtersRes, filtersJson);
      }

      const units = parseUnits(unitsJson);
      const priceLists = parsePriceLists(priceListsJson);
      const allTaxes = parseTaxes(taxesJson);
      const taxes = activeCompanyId
        ? allTaxes.filter((t) => !t.companyId || t.companyId === activeCompanyId)
        : allTaxes;
      const storages = parseStorages(filtersJson);

      const activeUnits = units.filter((u) => u.active);
      const unit =
        activeUnits.find((u) => u.isDefault) ??
        activeUnits.find((u) => u.symbol?.toLowerCase() === "un") ??
        activeUnits[0] ??
        null;
      if (!unit) {
        return {
          success: false,
          error: "No hay unidad de medida activa. Configúrala en el admin.",
        };
      }

      const activePriceLists = priceLists.filter((p) => p.isActive);
      const priceListId =
        activePriceLists.find((p) => p.isDefault)?.id ?? activePriceLists[0]?.id ?? null;
      if (!priceListId) {
        return { success: false, error: "No hay lista de precios activa." };
      }

      const taxIds = resolveDefaultIvaTaxIds(taxes);

      const activeStorages = storages.filter((s) => s.isActive);
      const defaultStorageId =
        activeStorages.find((s) => s.isDefault)?.id ?? activeStorages[0]?.id ?? null;
      if (!defaultStorageId) {
        return {
          success: false,
          error: "No hay almacén activo. Configúralo en el admin.",
        };
      }

      return {
        success: true,
        defaults: {
          unitId: unit.id,
          priceListId,
          defaultStorageId,
          defaultIvaTaxIds: taxIds,
          taxes,
          hasActiveIva: taxIds.length > 0,
        },
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al cargar catálogo",
      };
    }
  }
}
