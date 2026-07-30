import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import type { CompanyVoucherKind } from "../types/company-voucher-kinds.types";

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
  const activeCompanyId = (session?.user as any)?.activeCompanyId as
    | string
    | null
    | undefined;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  if (activeCompanyId) {
    h["X-Active-Company-Id"] = activeCompanyId;
  }
  return h;
}

export class CompaniesVoucherKindsRequest {
  static async get(
    companyId: string,
  ): Promise<
    | { success: true; voucherKinds: CompanyVoucherKind[] }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(
        apiUrl(`companies/${encodeURIComponent(companyId)}/voucher-kinds`),
        {
          method: "GET",
          headers: await authHeaders(),
          cache: "no-store",
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        voucherKinds?: CompanyVoucherKind[];
        message?: string;
      };
      if (!res.ok) {
        return { success: false, error: data?.message || res.statusText };
      }
      return {
        success: true,
        voucherKinds: Array.isArray(data.voucherKinds) ? data.voucherKinds : [],
      };
    } catch (e) {
      return {
        success: false,
        error:
          e instanceof Error
            ? e.message
            : "Error al cargar tipos de voucher",
      };
    }
  }

  static async replace(
    companyId: string,
    voucherKinds: CompanyVoucherKind[],
  ): Promise<
    | { success: true; voucherKinds: CompanyVoucherKind[] }
    | { success: false; error: string }
  > {
    try {
      const res = await fetch(
        apiUrl(`companies/${encodeURIComponent(companyId)}/voucher-kinds`),
        {
          method: "PUT",
          headers: await authHeaders(),
          body: JSON.stringify({ voucherKinds }),
          cache: "no-store",
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        voucherKinds?: CompanyVoucherKind[];
        message?: string;
      };
      if (!res.ok) {
        return { success: false, error: data?.message || res.statusText };
      }
      return {
        success: true,
        voucherKinds: Array.isArray(data.voucherKinds) ? data.voucherKinds : [],
      };
    } catch (e) {
      return {
        success: false,
        error:
          e instanceof Error
            ? e.message
            : "Error al actualizar tipos de voucher",
      };
    }
  }
}
