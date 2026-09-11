import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { apiUrl } from "@/shared/auth/backend-fetch";

export type ProductAddonRow = {
  id: string;
  hostProductId: string;
  addonProductId: string;
  sortOrder: number;
  addonProduct?: { id: string; name: string; productType?: string | null } | null;
};

export type AgregadoProductSearchRow = {
  id: string;
  name: string;
  productType?: string | null;
  categoryId?: string | null;
};

async function authHeaders(): Promise<Record<string, string>> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
  if (!token) throw new Error("No autenticado");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;
  return headers;
}

export class ProductAddonsRequest {
  static async list(hostProductId: string): Promise<ProductAddonRow[]> {
    const res = await fetch(apiUrl(`/products/${encodeURIComponent(hostProductId)}/addons`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }

  static async add(hostProductId: string, addonProductId: string): Promise<ProductAddonRow> {
    const res = await fetch(apiUrl(`/products/${encodeURIComponent(hostProductId)}/addons`), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ addonProductId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : `Error ${res.status}`,
      );
    }
    return (await res.json()) as ProductAddonRow;
  }

  static async remove(hostProductId: string, addonProductId: string): Promise<void> {
    const res = await fetch(
      apiUrl(
        `/products/${encodeURIComponent(hostProductId)}/addons/${encodeURIComponent(addonProductId)}`,
      ),
      { method: "DELETE", headers: await authHeaders() },
    );
    if (!res.ok) throw new Error(`Error ${res.status}`);
  }

  static async searchAgregados(input: {
    q?: string;
    categoryId?: string;
  }): Promise<AgregadoProductSearchRow[]> {
    const qs = new URLSearchParams();
    if (input.q?.trim()) qs.set("q", input.q.trim());
    if (input.categoryId?.trim()) qs.set("categoryId", input.categoryId.trim());
    const res = await fetch(apiUrl(`/products/agregado/search?${qs.toString()}`), {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }
}
