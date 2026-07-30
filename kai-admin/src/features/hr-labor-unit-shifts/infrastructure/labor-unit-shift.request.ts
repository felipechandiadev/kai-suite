import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type {
  ActiveLaborUnitShiftMembership,
  LaborUnitShiftMemberView,
  LaborUnitShiftView,
} from "../types/labor-unit-shift.types";

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
      typeof data.message === "string" ? data.message : `Error HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export class LaborUnitShiftRequest {
  static async list(laborUnitId?: string): Promise<LaborUnitShiftView[]> {
    const q = laborUnitId
      ? `?laborUnitId=${encodeURIComponent(laborUnitId)}`
      : "";
    const res = await fetch(apiUrl(`/hr/labor-unit-shifts${q}`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    const data = await parseJson(res);
    return (data.data as LaborUnitShiftView[]) ?? [];
  }

  static async getActiveForEmployee(
    employeeId: string,
  ): Promise<ActiveLaborUnitShiftMembership> {
    const res = await fetch(
      apiUrl(`/hr/labor-unit-shifts/employee/${employeeId}/active`),
      { headers: await authHeaders(), cache: "no-store" },
    );
    const data = await parseJson(res);
    return (data.data as ActiveLaborUnitShiftMembership) ?? null;
  }

  static async create(
    body: Record<string, unknown>,
  ): Promise<LaborUnitShiftView> {
    const res = await fetch(apiUrl("/hr/labor-unit-shifts"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await parseJson(res);
    return data.data as LaborUnitShiftView;
  }

  static async update(
    id: string,
    body: Record<string, unknown>,
  ): Promise<LaborUnitShiftView> {
    const res = await fetch(apiUrl(`/hr/labor-unit-shifts/${id}`), {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await parseJson(res);
    return data.data as LaborUnitShiftView;
  }

  static async listMembers(
    shiftId: string,
  ): Promise<LaborUnitShiftMemberView[]> {
    const res = await fetch(apiUrl(`/hr/labor-unit-shifts/${shiftId}/members`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    const data = await parseJson(res);
    return (data.data as LaborUnitShiftMemberView[]) ?? [];
  }

  static async addMember(
    shiftId: string,
    employeeId: string,
  ): Promise<LaborUnitShiftMemberView> {
    const res = await fetch(apiUrl(`/hr/labor-unit-shifts/${shiftId}/members`), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ employeeId }),
    });
    const data = await parseJson(res);
    return data.data as LaborUnitShiftMemberView;
  }

  static async removeMember(
    shiftId: string,
    employeeId: string,
  ): Promise<LaborUnitShiftMemberView> {
    const res = await fetch(
      apiUrl(`/hr/labor-unit-shifts/${shiftId}/members/${employeeId}`),
      { method: "DELETE", headers: await authHeaders() },
    );
    const data = await parseJson(res);
    return data.data as LaborUnitShiftMemberView;
  }
}
