import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";

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
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null } | undefined)
    ?.activeCompanyId;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  if (activeCompanyId) h["X-Active-Company-Id"] = activeCompanyId;
  return h;
}

/**
 * True si ya existe una variante con ese SKU o código de barras.
 */
export async function variantExistsBySkuOrBarcode(params: {
  sku?: string;
  barcode?: string;
}): Promise<
  | { exists: false }
  | { exists: true; by: "sku" | "barcode"; value: string }
  | { error: string }
> {
  const sku = params.sku?.trim() ?? "";
  const barcode = params.barcode?.trim() ?? "";
  if (!sku && !barcode) {
    return { exists: false };
  }

  const headers = await authHeaders();

  async function lookup(
    by: "sku" | "barcode",
    value: string,
  ): Promise<"found" | "missing" | "ambiguous" | "error"> {
    const q = new URLSearchParams({ value, by });
    const res = await fetch(apiUrl(`product-variants/scan/by-code?${q}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      if (res.status === 404) return "missing";
      return "error";
    }
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!json) return "missing";

    if (typeof json.variantId === "string" && json.variantId.trim()) {
      return "found";
    }
    if (Array.isArray(json.items)) {
      if (json.items.length === 0) return "missing";
      if (json.items.length > 1) return "ambiguous";
      return "found";
    }
    return "missing";
  }

  if (sku) {
    const r = await lookup("sku", sku);
    if (r === "error") {
      return { error: `No se pudo verificar SKU "${sku}".` };
    }
    if (r === "ambiguous") {
      return { error: `SKU "${sku}" coincide con varias variantes.` };
    }
    if (r === "found") {
      return { exists: true, by: "sku", value: sku };
    }
  }
  if (barcode) {
    const r = await lookup("barcode", barcode);
    if (r === "error") {
      return { error: `No se pudo verificar código de barras "${barcode}".` };
    }
    if (r === "ambiguous") {
      return {
        error: `Código de barras "${barcode}" coincide con varias variantes.`,
      };
    }
    if (r === "found") {
      return { exists: true, by: "barcode", value: barcode };
    }
  }
  return { exists: false };
}
