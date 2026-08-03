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

export type BulkResolvedVariant = {
  productId: string;
  productVariantId: string;
  productName: string;
  sku: string;
  barcode: string | null;
};

/**
 * Resuelve variante por SKU o código de barras (exacto).
 * Si ambos se informan, deben apuntar a la misma variante.
 */
export async function resolveVariantBySkuOrBarcode(params: {
  sku?: string;
  barcode?: string;
}): Promise<
  | { success: true; variant: BulkResolvedVariant }
  | { success: false; error: string }
> {
  const sku = params.sku?.trim() ?? "";
  const barcode = params.barcode?.trim() ?? "";
  if (!sku && !barcode) {
    return { success: false, error: "Indique SKU o código de barras." };
  }

  const headers = await authHeaders();

  async function lookup(by: "sku" | "barcode", value: string): Promise<BulkResolvedVariant | null | "ambiguous"> {
    const q = new URLSearchParams({ value, by });
    const res = await fetch(apiUrl(`product-variants/scan/by-code?${q}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!json) return null;

    let variantId = "";
    let productName = "";
    let foundSku = "";
    let foundBarcode: string | null = null;

    if (typeof json.variantId === "string" && json.variantId.trim()) {
      variantId = json.variantId.trim();
      productName = typeof json.productName === "string" ? json.productName : "";
      foundSku = typeof json.sku === "string" ? json.sku : value;
      foundBarcode =
        json.barcode != null && String(json.barcode).trim() ? String(json.barcode).trim() : null;
    } else if (Array.isArray(json.items)) {
      if (json.items.length === 0) return null;
      if (json.items.length > 1) return "ambiguous";
      const first = json.items[0] as Record<string, unknown>;
      variantId = first.variantId != null ? String(first.variantId) : "";
      productName = typeof first.productName === "string" ? first.productName : "";
      foundSku = typeof first.sku === "string" ? first.sku : value;
      foundBarcode =
        first.barcode != null && String(first.barcode).trim()
          ? String(first.barcode).trim()
          : null;
    }
    if (!variantId) return null;

    const detailRes = await fetch(apiUrl(`product-variants/${encodeURIComponent(variantId)}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!detailRes.ok) {
      return {
        productId: "",
        productVariantId: variantId,
        productName: productName || value,
        sku: foundSku,
        barcode: foundBarcode,
      };
    }
    const detail = (await detailRes.json().catch(() => null)) as Record<string, unknown> | null;
    const productId =
      detail?.productId != null
        ? String(detail.productId)
        : detail?.product != null &&
            typeof detail.product === "object" &&
            (detail.product as Record<string, unknown>).id != null
          ? String((detail.product as Record<string, unknown>).id)
          : "";
    const nameFromDetail =
      detail?.product != null &&
      typeof detail.product === "object" &&
      (detail.product as Record<string, unknown>).name != null
        ? String((detail.product as Record<string, unknown>).name)
        : productName;

    return {
      productId,
      productVariantId: variantId,
      productName: nameFromDetail || productName || value,
      sku: (detail?.sku != null ? String(detail.sku) : foundSku) || foundSku,
      barcode:
        detail?.barcode != null && String(detail.barcode).trim()
          ? String(detail.barcode).trim()
          : foundBarcode,
    };
  }

  let bySku: BulkResolvedVariant | null | "ambiguous" = null;
  let byBarcode: BulkResolvedVariant | null | "ambiguous" = null;
  if (sku) bySku = await lookup("sku", sku);
  if (barcode) byBarcode = await lookup("barcode", barcode);

  if (sku && bySku === "ambiguous") {
    return { success: false, error: `SKU "${sku}" coincide con varias variantes.` };
  }
  if (barcode && byBarcode === "ambiguous") {
    return {
      success: false,
      error: `Código de barras "${barcode}" coincide con varias variantes.`,
    };
  }
  if (sku && !bySku) {
    return { success: false, error: `No se encontró variante con SKU "${sku}".` };
  }
  if (barcode && !byBarcode) {
    return {
      success: false,
      error: `No se encontró variante con código de barras "${barcode}".`,
    };
  }
  if (sku && barcode && bySku && byBarcode && bySku !== "ambiguous" && byBarcode !== "ambiguous") {
    if (bySku.productVariantId !== byBarcode.productVariantId) {
      return {
        success: false,
        error: "SKU y código de barras corresponden a variantes distintas.",
      };
    }
  }

  const variant =
    (bySku && bySku !== "ambiguous" ? bySku : null) ??
    (byBarcode && byBarcode !== "ambiguous" ? byBarcode : null);
  if (!variant) {
    return { success: false, error: "No se pudo resolver el producto." };
  }
  if (!variant.productId.trim()) {
    return {
      success: false,
      error: `Variante ${variant.sku || variant.productVariantId} sin producto asociado.`,
    };
  }
  return { success: true, variant };
}
