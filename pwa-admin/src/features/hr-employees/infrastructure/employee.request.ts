import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  EmployeeDetailView,
  EmployeeGridRow,
  EmployeeListResult,
  EmployeePersonDetail,
  ResultCenterListItem,
  UpdateEmployeePayload,
  UpdateEmployeePersonPayload,
} from "../types/employee.types";

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
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  if (activeCompanyId) {
    h["X-Active-Company-Id"] = activeCompanyId;
  }
  return h;
}

function parseHttpErrorMessage(data: Record<string, unknown>): string {
  const msg = data.message;
  if (typeof msg === "string" && msg.trim()) {
    return msg.trim();
  }
  if (Array.isArray(msg) && msg.length > 0) {
    return String(msg[0]);
  }
  return "Error al procesar la solicitud.";
}

function mapPerson(raw: Record<string, unknown> | null | undefined): EmployeePersonDetail | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const id = raw.id != null ? String(raw.id) : "";
  if (!id) {
    return null;
  }
  return {
    id,
    firstName: raw.firstName != null ? String(raw.firstName) : null,
    lastName: raw.lastName != null ? String(raw.lastName) : null,
    businessName: raw.businessName != null ? String(raw.businessName) : null,
    documentType: raw.documentType != null ? String(raw.documentType) : null,
    documentNumber: raw.documentNumber != null ? String(raw.documentNumber) : null,
    email: raw.email != null ? String(raw.email) : null,
    phone: raw.phone != null ? String(raw.phone) : null,
    address: raw.address != null ? String(raw.address) : null,
  };
}

function mapNamedRef(
  raw: Record<string, unknown> | null | undefined,
): { id: string; name?: string | null; code?: string | null } | null {
  if (!raw || typeof raw !== "object" || raw.id == null) {
    return null;
  }
  return {
    id: String(raw.id),
    name: raw.name != null ? String(raw.name) : null,
    code: raw.code != null ? String(raw.code) : null,
  };
}

function mapEmployeeDetail(raw: Record<string, unknown>, fallbackId: string): EmployeeDetailView | null {
  const id = raw.id != null ? String(raw.id) : fallbackId;
  if (!id) {
    return null;
  }
  const personId = raw.personId != null ? String(raw.personId) : "";
  const branch = mapNamedRef(raw.branch as Record<string, unknown> | undefined);
  const resultCenter = mapNamedRef(raw.resultCenter as Record<string, unknown> | undefined);
  const organizationalUnit = mapNamedRef(
    raw.organizationalUnit as Record<string, unknown> | undefined,
  );
  const companyRaw = raw.company as Record<string, unknown> | undefined;
  const company =
    companyRaw && companyRaw.id != null
      ? { id: String(companyRaw.id), name: companyRaw.name != null ? String(companyRaw.name) : null }
      : null;

  return {
    id,
    personId:
      personId ||
      ((raw.person as Record<string, unknown> | undefined)?.id != null
        ? String((raw.person as Record<string, unknown>).id)
        : ""),
    companyId: raw.companyId != null ? String(raw.companyId) : undefined,
    branchId: raw.branchId != null ? String(raw.branchId) : branch?.id ?? null,
    resultCenterId:
      raw.resultCenterId != null ? String(raw.resultCenterId) : resultCenter?.id ?? null,
    organizationalUnitId:
      raw.organizationalUnitId != null
        ? String(raw.organizationalUnitId)
        : organizationalUnit?.id ?? null,
    laborUnitId: raw.laborUnitId != null ? String(raw.laborUnitId) : null,
    employmentType: raw.employmentType != null ? String(raw.employmentType) : undefined,
    workRegime: raw.workRegime != null ? String(raw.workRegime) : undefined,
    status: raw.status != null ? String(raw.status) : undefined,
    hireDate: raw.hireDate != null ? String(raw.hireDate) : undefined,
    terminationDate: raw.terminationDate != null ? String(raw.terminationDate) : null,
    baseSalary: raw.baseSalary != null ? String(raw.baseSalary) : null,
    person: mapPerson(raw.person as Record<string, unknown> | undefined),
    branch,
    resultCenter,
    organizationalUnit,
    company,
    createdAt: raw.createdAt != null ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt != null ? String(raw.updatedAt) : undefined,
  };
}

export class EmployeeRequest {
  static async list(opts: {
    includeTerminated?: boolean;
    status?: string;
    branchId?: string;
    companyId?: string;
  } = {}): Promise<EmployeeGridRow[]> {
    const params = new URLSearchParams();
    if (opts.includeTerminated) params.set("includeTerminated", "true");
    if (opts.status) params.set("status", opts.status);
    if (opts.branchId) params.set("branchId", opts.branchId);
    if (opts.companyId) params.set("companyId", opts.companyId);
    const qs = params.toString();
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`employees${qs ? `?${qs}` : ""}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`No se pudieron listar empleados (HTTP ${res.status})`);
    }
    const json = (await res.json()) as EmployeeListResult;
    if (!json.success || !Array.isArray(json.data)) {
      return [];
    }
    return json.data as EmployeeGridRow[];
  }

  static async getById(employeeId: string): Promise<EmployeeDetailView | null> {
    const id = employeeId?.trim();
    if (!id) {
      return null;
    }
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`employees/${encodeURIComponent(id)}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      return null;
    }
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!json || json.success === false) {
      return null;
    }
    const raw = json.data;
    if (!raw || typeof raw !== "object") {
      return null;
    }
    return mapEmployeeDetail(raw as Record<string, unknown>, id);
  }

  static async updatePerson(
    personId: string,
    body: UpdateEmployeePersonPayload,
  ): Promise<{ success: true; person: EmployeePersonDetail } | { success: false; error: string }> {
    const id = personId?.trim();
    if (!id) {
      return { success: false, error: "Persona no especificada." };
    }
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`persons/${encodeURIComponent(id)}`), {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return { success: false, error: parseHttpErrorMessage(data) };
    }
    const personRaw = data.person;
    if (!personRaw || typeof personRaw !== "object") {
      return { success: false, error: "Respuesta inválida del servidor." };
    }
    const person = mapPerson(personRaw as Record<string, unknown>);
    if (!person) {
      return { success: false, error: "Respuesta inválida del servidor." };
    }
    return { success: true, person };
  }

  static async update(
    employeeId: string,
    body: UpdateEmployeePayload,
  ): Promise<{ success: true; employee: EmployeeDetailView } | { success: false; error: string }> {
    const id = employeeId?.trim();
    if (!id) {
      return { success: false, error: "Empleado no especificado." };
    }
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`employees/${encodeURIComponent(id)}`), {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return { success: false, error: parseHttpErrorMessage(data) };
    }
    const raw = data.data;
    if (!raw || typeof raw !== "object") {
      return { success: false, error: "Respuesta inválida del servidor." };
    }
    const employee = mapEmployeeDetail(raw as Record<string, unknown>, id);
    if (!employee) {
      return { success: false, error: "Respuesta inválida del servidor." };
    }
    return { success: true, employee };
  }

  static async listResultCenters(): Promise<ResultCenterListItem[]> {
    const headers = await authHeaders();
    const res = await fetch(apiUrl("result-centers"), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      return [];
    }
    const json = (await res.json().catch(() => null)) as {
      success?: boolean;
      data?: unknown[];
    } | null;
    if (!json?.success || !Array.isArray(json.data)) {
      return [];
    }
    const items: ResultCenterListItem[] = [];
    for (const item of json.data) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const id = o.id != null ? String(o.id) : "";
      const name = o.name != null ? String(o.name).trim() : "";
      if (!id || !name) continue;
      items.push({
        id,
        name,
        code: o.code != null ? String(o.code) : null,
      });
    }
    return items;
  }

  static async createPerson(payload: {
    firstName: string;
    lastName?: string;
    documentType: string;
    documentNumber: string;
    email?: string;
    phone?: string;
  }): Promise<{ success: true; personId: string } | { success: false; error: string }> {
    const headers = await authHeaders();
    const res = await fetch(apiUrl("persons"), {
      method: "POST",
      headers,
      body: JSON.stringify({
        type: "NATURAL",
        firstName: payload.firstName,
        lastName: payload.lastName,
        documentType: payload.documentType,
        documentNumber: payload.documentNumber,
        email: payload.email,
        phone: payload.phone,
      }),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
      person?: { id?: string };
    };
    if (!res.ok) {
      return {
        success: false,
        error: json.message || `No se pudo crear la persona (HTTP ${res.status})`,
      };
    }
    const personId = json.person?.id;
    if (!json.success || !personId) {
      return { success: false, error: json.message || "Respuesta inválida al crear persona." };
    }
    return { success: true, personId };
  }

  static async create(payload: {
    personId: string;
    branchId?: string | null;
    laborUnitId?: string | null;
    employmentType: string;
    hireDate: string;
    baseSalary?: string | null;
    alsoAsUser?: {
      userName: string;
      mail: string;
      password: string;
      rol?: string;
    };
  }): Promise<{ success: true; id: string } | { success: false; error: string }> {
    const headers = await authHeaders();
    const res = await fetch(apiUrl("employees"), {
      method: "POST",
      headers,
      body: JSON.stringify({
        personId: payload.personId,
        branchId: payload.branchId ?? undefined,
        laborUnitId: payload.laborUnitId ?? undefined,
        employmentType: payload.employmentType,
        hireDate: payload.hireDate,
        baseSalary: payload.baseSalary ?? undefined,
        alsoAsUser: payload.alsoAsUser,
      }),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
      data?: { id?: string };
    };
    if (!res.ok) {
      return {
        success: false,
        error: json.message || `No se pudo crear el empleado (HTTP ${res.status})`,
      };
    }
    const id = json.data?.id;
    if (!json.success || !id) {
      return { success: false, error: json.message || "Respuesta inválida al crear empleado." };
    }
    return { success: true, id };
  }
}
