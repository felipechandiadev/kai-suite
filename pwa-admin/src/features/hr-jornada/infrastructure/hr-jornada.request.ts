import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  AttendanceDocumentView,
  JornadaConfigView,
  LedgerEntryView,
  ShiftExceptionView,
  ShiftTemplateView,
  WeekAssignmentInput,
  WeekPlanView,
} from "../types/jornada.types";

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) throw new Error("BACKEND_API_URL no está definida");
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function authHeaders(): Promise<HeadersInit> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })
    ?.activeCompanyId;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  if (activeCompanyId) h["X-Active-Company-Id"] = activeCompanyId;
  return h;
}

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      typeof data.message === "string"
        ? data.message
        : `Error HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export class HrJornadaRequest {
  static async getWeek(
    weekStart: string,
    laborUnitId?: string | null,
    branchId?: string | null,
  ): Promise<WeekPlanView> {
    const q = new URLSearchParams({ weekStart });
    if (laborUnitId) q.set("laborUnitId", laborUnitId);
    if (branchId) q.set("branchId", branchId);
    const res = await fetch(apiUrl(`/hr/jornada/week?${q}`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    const data = await parseJson(res);
    return data.data as WeekPlanView;
  }

  static async saveWeek(body: {
    weekStart: string;
    assignments: WeekAssignmentInput[];
    overrideReason?: string | null;
    laborUnitId?: string | null;
    branchId?: string | null;
  }): Promise<WeekPlanView> {
    const res = await fetch(apiUrl("/hr/jornada/week"), {
      method: "PUT",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await parseJson(res);
    return data.data as WeekPlanView;
  }

  static async validateWeek(assignments: WeekAssignmentInput[]) {
    const res = await fetch(apiUrl("/hr/jornada/week/validate"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ assignments }),
    });
    const data = await parseJson(res);
    return data.data as {
      findings: WeekPlanView["findings"];
      worstSeverity: WeekPlanView["worstSeverity"];
    };
  }

  static async getConfig(): Promise<JornadaConfigView> {
    const res = await fetch(apiUrl("/hr/jornada/config"), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    const data = await parseJson(res);
    return data.data as JornadaConfigView;
  }

  static async updateConfig(
    patch: Partial<JornadaConfigView>,
  ): Promise<JornadaConfigView> {
    const res = await fetch(apiUrl("/hr/jornada/config"), {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify(patch),
    });
    const data = await parseJson(res);
    return data.data as JornadaConfigView;
  }

  static async listTemplates(): Promise<ShiftTemplateView[]> {
    const res = await fetch(apiUrl("/hr/jornada/templates"), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    const data = await parseJson(res);
    return (data.data as ShiftTemplateView[]) ?? [];
  }

  static async createTemplate(body: {
    name: string;
    type: string;
    isNight?: boolean;
    isNightOutgoing?: boolean;
  }): Promise<ShiftTemplateView> {
    const res = await fetch(apiUrl("/hr/jornada/templates"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await parseJson(res);
    return data.data as ShiftTemplateView;
  }

  static async deleteTemplate(id: string): Promise<void> {
    const res = await fetch(apiUrl(`/hr/jornada/templates/${id}`), {
      method: "DELETE",
      headers: await authHeaders(),
    });
    await parseJson(res);
  }

  static async listExceptions(
    from: string,
    to: string,
  ): Promise<ShiftExceptionView[]> {
    const q = new URLSearchParams({ from, to });
    const res = await fetch(apiUrl(`/hr/jornada/exceptions?${q}`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    const data = await parseJson(res);
    return (data.data as ShiftExceptionView[]) ?? [];
  }

  static async createException(body: {
    employeeId: string;
    assignmentId?: string | null;
    workDate: string;
    type: string;
    minutes?: number;
    notes?: string | null;
    affectsPayroll?: boolean;
  }): Promise<ShiftExceptionView> {
    const res = await fetch(apiUrl("/hr/jornada/exceptions"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await parseJson(res);
    return data.data as ShiftExceptionView;
  }

  static async settleExceptions(periodStart: string, periodEnd: string) {
    const res = await fetch(apiUrl("/hr/jornada/exceptions/settle"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ periodStart, periodEnd }),
    });
    const data = await parseJson(res);
    return data.data as { settledCount: number; overtimeEmitted: number };
  }

  static async listLedger(employeeId: string): Promise<LedgerEntryView[]> {
    const res = await fetch(apiUrl(`/hr/jornada/ledger/${employeeId}`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    const data = await parseJson(res);
    return (data.data as LedgerEntryView[]) ?? [];
  }

  static async creditLedger(body: {
    employeeId: string;
    minutes: number;
    workDate?: string;
    reason?: string;
  }) {
    const res = await fetch(apiUrl("/hr/jornada/ledger/credit"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    await parseJson(res);
  }

  static async redeemLedger(body: {
    employeeId: string;
    minutes: number;
    reason?: string;
  }) {
    const res = await fetch(apiUrl("/hr/jornada/ledger/redeem"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    await parseJson(res);
  }

  static async expireLedger(asOfDate: string) {
    const res = await fetch(apiUrl("/hr/jornada/ledger/expire"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ asOfDate }),
    });
    await parseJson(res);
  }

  static async creditHolidays(weekStart: string) {
    const res = await fetch(apiUrl("/hr/jornada/week/credit-holidays"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ weekStart }),
    });
    await parseJson(res);
  }

  static async generateStatement(body: {
    employeeId: string;
    periodStart: string;
    periodEnd: string;
  }) {
    const res = await fetch(apiUrl("/hr/jornada/statements/generate"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await parseJson(res);
    return data.data as {
      document: AttendanceDocumentView;
      snapshot: Record<string, unknown>;
    };
  }

  static async listStatements(
    employeeId?: string,
  ): Promise<AttendanceDocumentView[]> {
    const q = employeeId
      ? `?employeeId=${encodeURIComponent(employeeId)}`
      : "";
    const res = await fetch(apiUrl(`/hr/jornada/statements${q}`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    const data = await parseJson(res);
    return (data.data as AttendanceDocumentView[]) ?? [];
  }

  static async attachSigned(id: string, signedDocumentUrl: string) {
    const res = await fetch(apiUrl(`/hr/jornada/statements/${id}/signed`), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ signedDocumentUrl }),
    });
    await parseJson(res);
  }

  static async ingestTimeEntry(body: {
    employeeId: string;
    kind: "IN" | "OUT";
    occurredAt: string;
    deviceId?: string;
    idempotencyKey?: string;
  }) {
    const res = await fetch(apiUrl("/hr/jornada/time-entries"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    await parseJson(res);
  }

  static async listEmployeeShifts(employeeId?: string) {
    const q = employeeId
      ? `?employeeId=${encodeURIComponent(employeeId)}`
      : "";
    const res = await fetch(apiUrl(`/hr/jornada/employee-shifts${q}`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    const data = await parseJson(res);
    return (data.data as import("../types/employee-shift.types").EmployeeShiftView[]) ?? [];
  }

  static async getActiveEmployeeShift(employeeId: string) {
    const res = await fetch(
      apiUrl(`/hr/jornada/employee-shifts/active/${employeeId}`),
      { headers: await authHeaders(), cache: "no-store" },
    );
    const data = await parseJson(res);
    return (data.data as import("../types/employee-shift.types").EmployeeShiftView) ?? null;
  }

  static async createEmployeeShift(body: Record<string, unknown>) {
    const res = await fetch(apiUrl("/hr/jornada/employee-shifts"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await parseJson(res);
    return data.data as import("../types/employee-shift.types").EmployeeShiftView;
  }

  static async updateEmployeeShift(id: string, body: Record<string, unknown>) {
    const res = await fetch(apiUrl(`/hr/jornada/employee-shifts/${id}`), {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await parseJson(res);
    return data.data as import("../types/employee-shift.types").EmployeeShiftView;
  }

  static async deleteEmployeeShift(id: string) {
    const res = await fetch(apiUrl(`/hr/jornada/employee-shifts/${id}`), {
      method: "DELETE",
      headers: await authHeaders(),
    });
    await parseJson(res);
  }

  static async loadWeekFromShifts(body: {
    weekStart: string;
    laborUnitId?: string | null;
    branchId?: string | null;
    employeeIds?: string[];
  }) {
    const res = await fetch(apiUrl("/hr/jornada/week/load-from-shifts"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await parseJson(res);
    return data.data as WeekPlanView & {
      loadedAssignments: WeekAssignmentInput[];
      employeesWithoutShift: string[];
      message: string | null;
    };
  }
}
