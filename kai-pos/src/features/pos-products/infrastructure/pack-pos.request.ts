import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";

export type PackProducibleQtyResponse = {
  producibleQty: number | null;
  reason?: string;
};

async function authHeaders(): Promise<Record<string, string> | null> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
  if (!token) return null;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;
  return headers;
}

export class PackPosRequest {
  static async getProducibleQty(input: {
    variantId: string;
    storageId: string;
  }): Promise<PackProducibleQtyResponse> {
    const base = process.env.BACKEND_API_URL;
    if (!base) return { producibleQty: null, reason: "NO_BACKEND" };
    const headers = await authHeaders();
    if (!headers) return { producibleQty: null, reason: "NO_AUTH" };
    const qs = new URLSearchParams({ storageId: input.storageId });
    const res = await fetch(
      `${base}/api/packs/variants/${encodeURIComponent(input.variantId)}/producible-qty?${qs.toString()}`,
      { headers, cache: "no-store" },
    );
    if (!res.ok) return { producibleQty: null, reason: "HTTP_ERROR" };
    return (await res.json()) as PackProducibleQtyResponse;
  }
}
