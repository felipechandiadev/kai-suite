import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  ExpenseCategoryOption,
  OperationalExpenseDocumentKind,
  OperationalExpenseGridRow,
  OperationalExpensePaymentStatus,
  OperationalExpenseStatus,
  SupplierOption,
} from "../types/operational-expense.types";

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

function normalizeExpense(row: unknown): OperationalExpenseGridRow | null {
  if (!row || typeof row !== "object") {
    return null;
  }
  const o = row as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  const companyId = o.companyId != null ? String(o.companyId) : "";
  const name = o.name != null ? String(o.name).trim() : "";
  const categoryId = o.categoryId != null ? String(o.categoryId) : "";
  const referenceNumber =
    o.referenceNumber != null && String(o.referenceNumber).trim()
      ? String(o.referenceNumber).trim()
      : null;
  const documentNumber =
    o.documentNumber != null && String(o.documentNumber).trim()
      ? String(o.documentNumber).trim()
      : null;
  const operationDate = o.operationDate != null ? String(o.operationDate) : "";
  if (!id || !companyId || !name || !categoryId || !operationDate) {
    return null;
  }

  const categoryRaw = o.category;
  let categoryName = "—";
  if (categoryRaw && typeof categoryRaw === "object") {
    const c = categoryRaw as Record<string, unknown>;
    if (c.name != null && String(c.name).trim()) {
      categoryName = String(c.name).trim();
    }
  }

  let supplierName: string | null = null;
  const supplierRaw = o.supplier;
  if (supplierRaw && typeof supplierRaw === "object") {
    const s = supplierRaw as Record<string, unknown>;
    const person = s.person && typeof s.person === "object" ? (s.person as Record<string, unknown>) : null;
    const alias = s.alias != null ? String(s.alias).trim() : "";
    const businessName = person?.businessName != null ? String(person.businessName).trim() : "";
    const fullName = [person?.firstName, person?.lastName].filter(Boolean).map(String).join(" ").trim();
    supplierName = alias || businessName || fullName || null;
  }

  const rawStatus = o.status != null ? String(o.status) : "DRAFT";
  const allowed = new Set(["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "CANCELLED"]);
  const status = (allowed.has(rawStatus) ? rawStatus : "DRAFT") as OperationalExpenseStatus;

  const rawPaymentStatus = o.paymentStatus != null ? String(o.paymentStatus) : null;
  const paymentAllowed = new Set(["PENDING", "PAID", "PARTIAL", "OVERDUE", "VOIDED"]);
  const paymentStatus =
    rawPaymentStatus && paymentAllowed.has(rawPaymentStatus)
      ? (rawPaymentStatus as OperationalExpensePaymentStatus)
      : null;

  const rawDocKind = o.documentKind != null ? String(o.documentKind) : null;
  const docKindAllowed = new Set([
    "SUPPLIER_INVOICE",
    "SUPPLIER_RECEIPT",
    "SUPPLIER_HONORARIUM_RECEIPT",
    "OTHER",
  ]);
  const documentKind =
    rawDocKind && docKindAllowed.has(rawDocKind)
      ? (rawDocKind as OperationalExpenseDocumentKind)
      : null;

  const netFromRow = o.netAmount != null ? Number(o.netAmount) : undefined;
  const taxFromRow = o.taxAmount != null ? Number(o.taxAmount) : undefined;
  const totalFromRow = o.totalAmount != null ? Number(o.totalAmount) : undefined;

  const metadata = o.metadata;
  const linked =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>).linkedTributaryDocument
      : null;
  const linkedAmounts =
    linked && typeof linked === "object" && !Array.isArray(linked)
      ? (linked as Record<string, unknown>)
      : null;

  const netAmount =
    netFromRow != null && Number.isFinite(netFromRow)
      ? netFromRow
      : linkedAmounts?.netAmount != null && Number.isFinite(Number(linkedAmounts.netAmount))
        ? Number(linkedAmounts.netAmount)
        : undefined;
  const taxAmount =
    taxFromRow != null && Number.isFinite(taxFromRow)
      ? taxFromRow
      : linkedAmounts?.taxAmount != null && Number.isFinite(Number(linkedAmounts.taxAmount))
        ? Number(linkedAmounts.taxAmount)
        : undefined;
  const totalAmount =
    totalFromRow != null && Number.isFinite(totalFromRow)
      ? totalFromRow
      : linkedAmounts?.totalAmount != null && Number.isFinite(Number(linkedAmounts.totalAmount))
        ? Number(linkedAmounts.totalAmount)
        : undefined;

  return {
    id,
    companyId,
    name,
    categoryId,
    categoryName,
    referenceNumber,
    documentNumber,
    operationDate,
    status,
    paymentStatus,
    documentKind,
    description: o.description != null && String(o.description).trim() ? String(o.description).trim() : null,
    branchId: o.branchId != null ? String(o.branchId) : null,
    supplierId: o.supplierId != null ? String(o.supplierId) : null,
    supplierName,
    employeeId: o.employeeId != null ? String(o.employeeId) : null,
    netAmount,
    taxAmount,
    totalAmount,
    createdAt: o.createdAt != null ? String(o.createdAt) : undefined,
  };
}

function normalizeCategory(row: unknown): ExpenseCategoryOption | null {
  if (!row || typeof row !== "object") {
    return null;
  }
  const o = row as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  const name = o.name != null ? String(o.name).trim() : "";
  if (!id || !name) {
    return null;
  }
  return { id, name };
}

export class OperationalExpenseRequest {
  static async list(
    companyId: string,
    limit = 500,
    offset = 0,
    status?: OperationalExpenseStatus,
  ): Promise<{ rows: OperationalExpenseGridRow[]; total: number }> {
    const headers = await authHeaders();
    const q = new URLSearchParams();
    q.set("companyId", companyId);
    q.set("limit", String(Math.min(500, Math.max(1, limit))));
    q.set("offset", String(Math.max(0, offset)));
    if (status) {
      q.set("status", status);
    }
    try {
      const res = await fetch(apiUrl(`operating-expenses?${q.toString()}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        return { rows: [], total: 0 };
      }
      const json = (await res.json()) as Record<string, unknown>;
      const rawData = Array.isArray(json.data) ? json.data : [];
      const rows = rawData.map(normalizeExpense).filter((x): x is OperationalExpenseGridRow => x != null);
      const total =
        typeof json.total === "number" && Number.isFinite(json.total)
          ? json.total
          : rows.length;
      return { rows, total };
    } catch {
      return { rows: [], total: 0 };
    }
  }

  static async listExpenseCategoryOptions(companyId: string): Promise<ExpenseCategoryOption[]> {
    const headers = await authHeaders();
    const q = new URLSearchParams({
      companyId,
      limit: "500",
      offset: "0",
    });
    try {
      const res = await fetch(apiUrl(`expense-categories?${q.toString()}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        return [];
      }
      const json = (await res.json()) as Record<string, unknown>;
      const data = Array.isArray(json.data) ? json.data : [];
      return data.map(normalizeCategory).filter((x): x is ExpenseCategoryOption => x != null);
    } catch {
      return [];
    }
  }

  static async create(body: {
    companyId: string;
    name: string;
    categoryId: string;
    supplierId: string;
    referenceNumber: string;
    operationDate: string;
    createdBy: string;
    description?: string;
    status?: OperationalExpenseStatus;
    documentKind: OperationalExpenseDocumentKind;
    fiscalAmounts: {
      subtotal: number;
      taxAmount: number;
      total: number;
      taxId?: string;
    };
    supplierDocumentPayment: {
      mode: string;
      partialPaidAmount?: number;
      paidLines: unknown[];
      scheduledLines: unknown[];
    };
  }): Promise<{ success: true; id: string } | { success: false; error: string }> {
    const headers = await authHeaders();
    const payload = {
      companyId: body.companyId,
      name: body.name.trim(),
      categoryId: body.categoryId,
      supplierId: body.supplierId,
      referenceNumber: body.referenceNumber.trim(),
      operationDate: body.operationDate,
      createdBy: body.createdBy,
      status: body.status ?? "APPROVED",
      documentKind: body.documentKind,
      fiscalAmounts: body.fiscalAmounts,
      supplierDocumentPayment: body.supplierDocumentPayment,
      ...(body.description?.trim() ? { description: body.description.trim() } : {}),
    };
    try {
      const res = await fetch(apiUrl("operating-expenses"), {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
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
      const id = data.id != null ? String(data.id) : "";
      if (!id) {
        return { success: false, error: "Respuesta inválida del servidor" };
      }
      return { success: true, id };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Error al crear gasto operativo" };
    }
  }

  static async listSupplierOptions(): Promise<SupplierOption[]> {
    const headers = await authHeaders();
    const q = new URLSearchParams({
      limit: "500",
      offset: "0",
    });
    try {
      const res = await fetch(apiUrl(`suppliers?${q.toString()}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        return [];
      }
      const json = (await res.json()) as Record<string, unknown>;
      const data = Array.isArray(json.data) ? json.data : [];
      return data
        .map((row) => {
          if (!row || typeof row !== "object") {
            return null;
          }
          const o = row as Record<string, unknown>;
          const id = o.id != null ? String(o.id) : "";
          if (!id) {
            return null;
          }
          const person = o.person && typeof o.person === "object" ? (o.person as Record<string, unknown>) : null;
          const alias = o.alias != null ? String(o.alias).trim() : "";
          const businessName = person?.businessName != null ? String(person.businessName).trim() : "";
          const fullName = [person?.firstName, person?.lastName].filter(Boolean).map(String).join(" ").trim();
          const name = alias || businessName || fullName || "Proveedor";
          return { id, name } satisfies SupplierOption;
        })
        .filter((x): x is SupplierOption => x != null);
    } catch {
      return [];
    }
  }
}
