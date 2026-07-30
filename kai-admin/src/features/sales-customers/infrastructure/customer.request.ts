import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  CreateCustomerFormInput,
  CustomerDetailView,
  CustomerEshopAccountView,
  CustomerListResult,
  CustomerListRow,
  PersonGeoFields,
  UpdateCustomerPayload,
} from "../types/customer.types";
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

function normalizeRow(raw: unknown): CustomerListRow | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const customerId = o.customerId != null ? String(o.customerId) : "";
  const personId = o.personId != null ? String(o.personId) : "";
  if (!customerId || !personId) {
    return null;
  }
  return {
    id: customerId,
    customerId,
    personId,
    displayName: o.displayName != null ? String(o.displayName) : "—",
    documentType: o.documentType != null && String(o.documentType).trim() !== "" ? String(o.documentType) : null,
    documentNumber: o.documentNumber != null ? String(o.documentNumber) : null,
    email: o.email != null ? String(o.email) : null,
    phone: o.phone != null ? String(o.phone) : null,
    creditLimit: typeof o.creditLimit === "number" && Number.isFinite(o.creditLimit) ? o.creditLimit : Number(o.creditLimit) || 0,
    currentBalance:
      typeof o.currentBalance === "number" && Number.isFinite(o.currentBalance)
        ? o.currentBalance
        : Number(o.currentBalance) || 0,
    availableCredit:
      typeof o.availableCredit === "number" && Number.isFinite(o.availableCredit)
        ? o.availableCredit
        : Number(o.availableCredit) || 0,
    paymentDayOfMonth:
      typeof o.paymentDayOfMonth === "number" && Number.isFinite(o.paymentDayOfMonth)
        ? o.paymentDayOfMonth
        : o.paymentDayOfMonth != null
          ? Number(o.paymentDayOfMonth)
          : null,
    isActive: o.isActive !== false,
    hasEshopAccount: o.hasEshopAccount === true,
    eshopUsername:
      o.eshopUsername != null && String(o.eshopUsername).trim() !== ""
        ? String(o.eshopUsername)
        : null,
    eshopLoginEmail:
      o.eshopLoginEmail != null && String(o.eshopLoginEmail).trim() !== ""
        ? String(o.eshopLoginEmail)
        : null,
    createdAt: o.createdAt != null ? String(o.createdAt) : undefined,
    updatedAt: o.updatedAt != null ? String(o.updatedAt) : undefined,
  };
}

function mapEconomicActivities(raw: unknown): PersonEconomicActivity[] | null {
  if (!Array.isArray(raw)) return null;
  const out: PersonEconomicActivity[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const code = o.code != null ? String(o.code).trim() : "";
    if (!code) continue;
    const category = o.category === "SEGUNDA" ? "SEGUNDA" : "PRIMERA";
    out.push({
      code,
      name: o.name != null ? String(o.name) : code,
      category,
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
    activityStarted: o.activityStarted === true || (mapEconomicActivities(o.economicActivities)?.length ?? 0) > 0,
    economicActivities: mapEconomicActivities(o.economicActivities),
  };
}

function mapEshopAccountFromJson(raw: unknown): CustomerEshopAccountView | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const accountId = o.accountId != null ? String(o.accountId) : "";
  const loginEmail = o.loginEmail != null ? String(o.loginEmail).trim() : "";
  if (!accountId || !loginEmail) return null;
  return {
    accountId,
    username:
      o.username != null && String(o.username).trim() !== "" ? String(o.username) : null,
    loginEmail,
    registeredAt: o.registeredAt != null ? String(o.registeredAt) : "",
    emailVerifiedAt:
      o.emailVerifiedAt != null && String(o.emailVerifiedAt).trim() !== ""
        ? String(o.emailVerifiedAt)
        : null,
    updatedAt: o.updatedAt != null ? String(o.updatedAt) : "",
    webOrdersCount:
      typeof o.webOrdersCount === "number" && Number.isFinite(o.webOrdersCount)
        ? o.webOrdersCount
        : Number(o.webOrdersCount) || 0,
  };
}

function mapCustomerDetailFromJson(
  c: Record<string, unknown>,
  fallbackCustomerId: string,
): CustomerDetailView {
  return {
    customerId: String(c.customerId ?? fallbackCustomerId),
    personId: String(c.personId ?? ""),
    personType: c.personType != null && String(c.personType).trim() !== "" ? String(c.personType) : null,
    firstName: c.firstName != null ? String(c.firstName) : null,
    lastName: c.lastName != null ? String(c.lastName) : null,
    businessName: c.businessName != null ? String(c.businessName) : null,
    displayName: c.displayName != null ? String(c.displayName) : "—",
    documentType: c.documentType != null && String(c.documentType).trim() !== "" ? String(c.documentType) : null,
    documentNumber: c.documentNumber != null ? String(c.documentNumber) : null,
    email: c.email != null ? String(c.email) : null,
    phone: c.phone != null ? String(c.phone) : null,
    address: c.address != null ? String(c.address) : null,
    ...mapPersonGeoFields(c),
    creditLimit: Number(c.creditLimit) || 0,
    usedCredit: Number(c.usedCredit) || 0,
    availableCredit: Number(c.availableCredit) || 0,
    paymentDayOfMonth:
      typeof c.paymentDayOfMonth === "number" && Number.isFinite(c.paymentDayOfMonth)
        ? c.paymentDayOfMonth
        : c.paymentDayOfMonth != null
          ? Number(c.paymentDayOfMonth)
          : null,
    isActive: c.isActive !== false,
    eshopAccount: mapEshopAccountFromJson(c.eshopAccount),
    createdAt: c.createdAt != null ? String(c.createdAt) : undefined,
    updatedAt: c.updatedAt != null ? String(c.updatedAt) : undefined,
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

export class CustomerRequest {
  static async list(opts: { page?: number; pageSize?: number; query?: string } = {}): Promise<CustomerListResult> {
    const headers = await authHeaders();
    const p = Math.max(1, Math.round(Number(opts.page) || 1));
    const ps = Math.min(50, Math.max(1, Math.round(Number(opts.pageSize) || 50)));
    const q = new URLSearchParams();
    q.set("page", String(p));
    q.set("pageSize", String(ps));
    if (opts.query != null && String(opts.query).trim() !== "") {
      q.set("query", String(opts.query).trim());
    }
    const res = await fetch(apiUrl(`customers?${q.toString()}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `HTTP ${res.status}`);
    }
    const json = (await res.json()) as Record<string, unknown>;
    const customersRaw = json.customers;
    const arr = Array.isArray(customersRaw) ? customersRaw : [];
    const customers = arr.map(normalizeRow).filter((x): x is CustomerListRow => x != null);
    const total = typeof json.total === "number" && Number.isFinite(json.total) ? json.total : customers.length;
    return {
      success: json.success === true,
      page: typeof json.page === "number" ? json.page : p,
      pageSize: typeof json.pageSize === "number" ? json.pageSize : ps,
      total,
      customers,
    };
  }

  static async getById(customerId: string): Promise<CustomerDetailView | null> {
    const id = customerId?.trim();
    if (!id) {
      return null;
    }
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`customers/${encodeURIComponent(id)}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      return null;
    }
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    const raw = json?.customer;
    if (!raw || typeof raw !== "object") {
      return null;
    }
    return mapCustomerDetailFromJson(raw as Record<string, unknown>, id);
  }

  static async update(
    customerId: string,
    body: UpdateCustomerPayload,
  ): Promise<{ success: true; customer: CustomerDetailView } | { success: false; error: string }> {
    const id = customerId?.trim();
    if (!id) {
      return { success: false, error: "Cliente no especificado." };
    }
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`customers/${encodeURIComponent(id)}`), {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return { success: false, error: parseHttpErrorMessage(data) };
    }
    if (data.success === false) {
      return { success: false, error: parseHttpErrorMessage(data) };
    }
    const raw = data.customer;
    if (!raw || typeof raw !== "object") {
      return { success: false, error: "Respuesta inválida del servidor." };
    }
    return { success: true, customer: mapCustomerDetailFromJson(raw as Record<string, unknown>, id) };
  }

  static async getPayments(customerId: string): Promise<Record<string, unknown>[]> {
    const id = customerId?.trim();
    if (!id) {
      return [];
    }
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`customers/${encodeURIComponent(id)}/payments`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `HTTP ${res.status}`);
    }
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const arr = json.payments;
    if (Array.isArray(arr)) return arr;
    if (arr && typeof arr === "object" && Array.isArray((arr as { payments?: unknown }).payments)) {
      return (arr as { payments: Record<string, unknown>[] }).payments;
    }
    return [];
  }

  static async getPurchases(customerId: string): Promise<Record<string, unknown>[]> {
    const id = customerId?.trim();
    if (!id) {
      return [];
    }
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`customers/${encodeURIComponent(id)}/purchases`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `HTTP ${res.status}`);
    }
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const arr = json.purchases;
    return Array.isArray(arr) ? arr : [];
  }

  static async getBackorders(customerId: string): Promise<Record<string, unknown>[]> {
    const id = customerId?.trim();
    if (!id) {
      return [];
    }
    const headers = await authHeaders();
    const q = new URLSearchParams({
      customerId: id,
      page: "1",
      limit: "200",
    });
    const res = await fetch(apiUrl(`transactions/backorders?${q.toString()}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `HTTP ${res.status}`);
    }
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const arr = (json.data ?? json.rows) as unknown;
    return Array.isArray(arr) ? (arr as Record<string, unknown>[]) : [];
  }

  static async getCustomerReturns(customerId: string): Promise<Record<string, unknown>[]> {
    const id = customerId?.trim();
    if (!id) return [];
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`customers/${encodeURIComponent(id)}/customer-returns`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `HTTP ${res.status}`);
    }
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return Array.isArray(json.returns) ? json.returns : [];
  }

  static async getCustomerCreditNotes(customerId: string): Promise<Record<string, unknown>[]> {
    const id = customerId?.trim();
    if (!id) return [];
    const headers = await authHeaders();
    const res = await fetch(
      apiUrl(`customers/${encodeURIComponent(id)}/customer-credit-notes`),
      { method: "GET", headers, cache: "no-store" },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `HTTP ${res.status}`);
    }
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return Array.isArray(json.creditNotes) ? json.creditNotes : [];
  }

  static async getPendingQuotas(customerId: string): Promise<Record<string, unknown>[]> {
    const id = customerId?.trim();
    if (!id) {
      return [];
    }
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`customers/${encodeURIComponent(id)}/pending-quotas`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      return [];
    }
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const arr = json.quotas;
    return Array.isArray(arr) ? arr : [];
  }

  static async create(
    body: CreateCustomerFormInput,
  ): Promise<{ success: true; customer: Record<string, unknown> } | { success: false; error: string }> {
    const headers = await authHeaders();
    const payload =
      body.personId?.trim()
        ? {
            personId: body.personId.trim(),
            email: body.email?.trim() || undefined,
            phone: body.phone?.trim() || undefined,
            creditLimit: body.creditLimit,
            paymentDayOfMonth: body.paymentDayOfMonth,
            notes: body.notes?.trim() || undefined,
          }
        : {
            personType: body.personType,
            firstName: (body.firstName ?? "").trim(),
            lastName: body.lastName?.trim() || undefined,
            businessName: body.businessName?.trim() || undefined,
            documentType: body.documentType,
            documentNumber: (body.documentNumber ?? "").trim(),
            email: body.email?.trim() || undefined,
            phone: body.phone?.trim() || undefined,
            address: body.address?.trim() || undefined,
            regionCode: body.regionCode,
            regionName: body.regionName,
            communeCode: body.communeCode,
            communeName: body.communeName,
            treasuryCode: body.treasuryCode,
            activityStarted: body.activityStarted === true,
            economicActivities: body.activityStarted ? body.economicActivities : null,
            creditLimit: body.creditLimit,
            paymentDayOfMonth: body.paymentDayOfMonth,
            notes: body.notes?.trim() || undefined,
          };
    const res = await fetch(apiUrl("customers"), {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const m = data.message;
      const msg = Array.isArray(m) ? m.map(String).join("; ") : typeof m === "string" ? m : "No se pudo crear el cliente";
      return { success: false, error: msg };
    }
    if (data.success === false) {
      return { success: false, error: typeof data.error === "string" ? data.error : "No se pudo crear el cliente" };
    }
    return { success: true, customer: data };
  }
}
