import { apiFailure } from "@/lib/auth/api-response";
import { apiUrl, authHeaders } from "@/lib/auth/auth-headers";
import type { UpdateVariantPricingInput } from "../types/pricing.types";

export class VariantPricingRequest {
  static async updatePricing(
    variantId: string,
    input: UpdateVariantPricingInput,
  ): Promise<{ success: true } | { success: false; error: string; unauthorized?: boolean }> {
    const headers = await authHeaders();
    const id = variantId.trim();
    const productId = input.productId.trim();
    if (!id || !productId) {
      return { success: false, error: "Datos no válidos" };
    }
    try {
      const res = await fetch(apiUrl(`product-variants/${encodeURIComponent(id)}`), {
        method: "PUT",
        headers,
        body: JSON.stringify({
          productId,
          basePrice: input.basePrice,
          priceListItems: input.priceListItems.map((item) => ({
            priceListId: item.priceListId.trim(),
            netPrice: Math.round(Number(item.netPrice)) || 0,
            grossPrice: Math.round(Number(item.grossPrice)) || 0,
            taxIds: Array.isArray(item.taxIds) && item.taxIds.length > 0 ? item.taxIds : undefined,
            maxDiscountPercent:
              item.maxDiscountPercent != null && Number.isFinite(Number(item.maxDiscountPercent))
                ? Number(item.maxDiscountPercent)
                : null,
            minPrice:
              item.minPrice != null && Number.isFinite(Number(item.minPrice))
                ? Math.round(Number(item.minPrice))
                : null,
          })),
        }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        return apiFailure(res, data);
      }
      return { success: true };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al guardar precios",
      };
    }
  }
}
