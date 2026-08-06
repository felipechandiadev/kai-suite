import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  CreateProductionUnitInput,
  ProductionUnitInventoryMode,
  ProductionUnitListItem,
  ProductionUnitPurpose,
  ProductionUnitScope,
  UpdateProductionUnitInput,
  VariantProductionCostPreview,
} from "../types/production-unit.types";

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) throw new Error("BACKEND_API_URL no está definida");
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function authHeaders(): Promise<HeadersInit> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = (session?.user as { activeCompanyId?: string })?.activeCompanyId;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  if (activeCompanyId) h["X-Active-Company-Id"] = activeCompanyId;
  return h;
}

function mapUnit(raw: Record<string, unknown>): ProductionUnitListItem {
  const scope: ProductionUnitScope =
    raw.scope === "COMPANY" ? "COMPANY" : "BRANCH";
  const inventoryMode: ProductionUnitInventoryMode =
    raw.inventoryMode === "AUTONOMOUS" ? "AUTONOMOUS" : "DEPENDENT";
  const purpose: ProductionUnitPurpose =
    raw.purpose === "BATCH" ? "BATCH" : "KITCHEN";
  const kitchenFulfillmentMode =
    raw.kitchenFulfillmentMode === "PRINTED"
      ? "PRINTED"
      : raw.kitchenFulfillmentMode === "BOTH"
        ? "BOTH"
        : "KDS";
  const rawPrint = raw.kitchenPrintSettings;
  let kitchenPrintSettings: ProductionUnitListItem["kitchenPrintSettings"] = null;
  if (rawPrint && typeof rawPrint === "object" && !Array.isArray(rawPrint)) {
    const o = rawPrint as Record<string, unknown>;
    kitchenPrintSettings = {
      printAgentId:
        o.printAgentId != null && String(o.printAgentId).trim()
          ? String(o.printAgentId).trim()
          : null,
      printerDisplayLabel:
        o.printerDisplayLabel != null && String(o.printerDisplayLabel).trim()
          ? String(o.printerDisplayLabel).trim()
          : null,
    };
  }
  return {
    id: String(raw.id),
    branchId: raw.branchId != null ? String(raw.branchId) : null,
    scope,
    inventoryMode,
    purpose,
    code: String(raw.code ?? ""),
    name: String(raw.name ?? ""),
    defaultInputStorageId:
      raw.defaultInputStorageId != null ? String(raw.defaultInputStorageId) : null,
    defaultOutputStorageId:
      raw.defaultOutputStorageId != null ? String(raw.defaultOutputStorageId) : null,
    monthlyCapacity:
      raw.monthlyCapacity != null && Number.isFinite(Number(raw.monthlyCapacity))
        ? Number(raw.monthlyCapacity)
        : raw.computedCapacity != null &&
            Number.isFinite(Number(raw.computedCapacity))
          ? Number(raw.computedCapacity)
          : null,
    computedCapacity:
      raw.computedCapacity != null &&
      Number.isFinite(Number(raw.computedCapacity))
        ? Number(raw.computedCapacity)
        : raw.monthlyCapacity != null &&
            Number.isFinite(Number(raw.monthlyCapacity))
          ? Number(raw.monthlyCapacity)
          : null,
    laborUnitIds: Array.isArray(raw.laborUnitIds)
      ? raw.laborUnitIds.map((id) => String(id)).filter(Boolean)
      : [],
    employeeIds: Array.isArray(raw.employeeIds)
      ? raw.employeeIds.map((id) => String(id)).filter(Boolean)
      : [],
    employeeCount:
      raw.employeeCount != null && Number.isFinite(Number(raw.employeeCount))
        ? Number(raw.employeeCount)
        : undefined,
    monthlyPayrollTotal:
      raw.monthlyPayrollTotal != null &&
      Number.isFinite(Number(raw.monthlyPayrollTotal))
        ? Number(raw.monthlyPayrollTotal)
        : undefined,
    laborCostPerUnit:
      raw.laborCostPerUnit != null && Number.isFinite(Number(raw.laborCostPerUnit))
        ? Number(raw.laborCostPerUnit)
        : null,
    isActive: raw.isActive !== false,
    kitchenFulfillmentMode,
    kitchenPrintSettings,
  };
}

export const ProductionUnitRequest = {
  async list(
    branchId?: string,
    opts?: { purpose?: ProductionUnitPurpose },
  ): Promise<ProductionUnitListItem[]> {
    const qs = new URLSearchParams();
    if (branchId) qs.set("branchId", branchId);
    if (opts?.purpose) qs.set("purpose", opts.purpose);
    qs.set("includeInactive", "true");
    const res = await fetch(apiUrl(`/production-units?${qs.toString()}`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((row) => mapUnit(row as Record<string, unknown>));
  },

  async create(input: CreateProductionUnitInput): Promise<ProductionUnitListItem | null> {
    const res = await fetch(apiUrl("/production-units"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let message = `No se pudo crear la unidad (HTTP ${res.status})`;
      try {
        const json = JSON.parse(text) as { message?: string | string[] };
        if (typeof json.message === "string" && json.message.trim()) {
          message = json.message.trim();
        } else if (Array.isArray(json.message)) {
          message = json.message.map(String).filter(Boolean).join(", ") || message;
        }
      } catch {
        if (text.trim()) message = text.trim();
      }
      throw new Error(message);
    }
    return mapUnit((await res.json()) as Record<string, unknown>);
  },

  async update(
    id: string,
    input: Omit<UpdateProductionUnitInput, "id">,
  ): Promise<ProductionUnitListItem | null> {
    const res = await fetch(apiUrl(`/production-units/${id}`), {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let message = `No se pudo actualizar la unidad (HTTP ${res.status})`;
      try {
        const json = JSON.parse(text) as { message?: string | string[] };
        if (typeof json.message === "string" && json.message.trim()) {
          message = json.message.trim();
        } else if (Array.isArray(json.message)) {
          message = json.message.map(String).filter(Boolean).join(", ") || message;
        }
      } catch {
        if (text.trim()) message = text.trim();
      }
      throw new Error(message);
    }
    return mapUnit((await res.json()) as Record<string, unknown>);
  },

  async costPreview(
    productionUnitId: string,
    variantId: string,
  ): Promise<VariantProductionCostPreview | null> {
    if (!productionUnitId || !variantId) return null;
    const qs = new URLSearchParams({ variantId });
    const res = await fetch(
      apiUrl(`/production-units/${productionUnitId}/cost-preview?${qs}`),
      {
        headers: await authHeaders(),
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    const raw = (await res.json()) as Record<string, unknown>;
    if (raw.success === false) return null;
    return {
      variantId: String(raw.variantId ?? variantId),
      productionUnitId: String(raw.productionUnitId ?? productionUnitId),
      materialsPerUnit:
        raw.materialsPerUnit != null &&
        Number.isFinite(Number(raw.materialsPerUnit))
          ? Number(raw.materialsPerUnit)
          : null,
      laborPerUnit:
        raw.laborPerUnit != null && Number.isFinite(Number(raw.laborPerUnit))
          ? Number(raw.laborPerUnit)
          : null,
      unitCostPreview:
        raw.unitCostPreview != null &&
        Number.isFinite(Number(raw.unitCostPreview))
          ? Number(raw.unitCostPreview)
          : null,
      materialsWarning:
        typeof raw.materialsWarning === "string" ? raw.materialsWarning : null,
      laborWarning:
        typeof raw.laborWarning === "string" ? raw.laborWarning : null,
    };
  },
};
