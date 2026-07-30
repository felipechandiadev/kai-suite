import { apiFailure } from "@/lib/auth/api-response";
import { apiUrl, authHeaders } from "@/lib/auth/auth-headers";

export class ProductRequest {
  static async createProduct(name: string): Promise<
    { success: true; id: string } | { success: false; error: string; unauthorized?: boolean }
  > {
    const headers = await authHeaders();
    try {
      const res = await fetch(apiUrl("products"), {
        method: "POST",
        headers,
        body: JSON.stringify({ name: name.trim(), isActive: true, productType: "PHYSICAL" }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        return apiFailure(res, data);
      }
      const id = data.id != null ? String(data.id) : "";
      if (!id) return { success: false, error: "Respuesta inválida del servidor" };
      return { success: true, id };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al crear producto",
      };
    }
  }

  static async createVariant(body: {
    productId: string;
    sku: string;
    barcode?: string | null;
    basePrice: number;
    unitId: string;
    /** Omitir para dejar PMP sin definir (0 en backend, sin historial). */
    pmp?: number;
    taxCategory?: string;
    taxIds?: string[];
    priceListItems: Array<{
      priceListId: string;
      netPrice: number;
      grossPrice: number;
      taxIds?: string[];
    }>;
  }): Promise<{ success: true; id: string } | { success: false; error: string; unauthorized?: boolean }> {
    const headers = await authHeaders();
    const unitId = body.unitId;
    const payload: Record<string, unknown> = {
      productId: body.productId,
      sku: body.sku.trim(),
      basePrice: Math.round(body.basePrice),
      unitId,
      saleUnitId: unitId,
      stockBaseUnitId: unitId,
      purchaseUnitId: unitId,
      isActive: true,
      trackInventory: true,
      taxCategory: body.taxCategory ?? "TAX_STANDARD",
      requiresDte: true,
      priceListItems: body.priceListItems.map((item) => ({
        priceListId: item.priceListId,
        netPrice: Math.round(item.netPrice),
        grossPrice: Math.round(item.grossPrice),
        taxIds: item.taxIds?.length ? item.taxIds : undefined,
      })),
    };
    if (body.taxIds?.length) {
      payload.taxIds = body.taxIds;
    }
    if (body.pmp !== undefined && body.pmp !== null) {
      payload.pmp = Math.max(0, Math.round(body.pmp));
    }
    if (body.barcode?.trim()) {
      payload.barcode = body.barcode.trim();
    }
    try {
      const res = await fetch(apiUrl("product-variants"), {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        return apiFailure(res, data);
      }
      if (data.success === false) {
        const err =
          typeof data.error === "string" && data.error.trim()
            ? data.error.trim()
            : "Error al crear variante";
        return { success: false, error: err };
      }
      const variant = data.variant as Record<string, unknown> | undefined;
      const id =
        variant?.id != null
          ? String(variant.id)
          : data.id != null
            ? String(data.id)
            : "";
      if (!id) return { success: false, error: "Respuesta inválida del servidor" };
      return { success: true, id };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Error al crear variante",
      };
    }
  }
}
