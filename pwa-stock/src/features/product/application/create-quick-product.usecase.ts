import { StockRequest } from "@/features/stock/infrastructure/stock.request";
import { CatalogRequest } from "../infrastructure/catalog.request";
import { ProductRequest } from "../infrastructure/product.request";
import {
  effectiveIvaFactor,
  grossToNet,
  roundMoneyInt,
} from "../domain/price-tax";
import {
  quickCreateProductInputSchema,
  type QuickCreateProductInput,
} from "../domain/quick-create-product.entity";

export type CreateQuickProductResult =
  | { ok: true; variantId: string; sku: string }
  | { ok: false; error: string; unauthorized?: boolean };

export async function createQuickProductUseCase(
  input: QuickCreateProductInput,
): Promise<CreateQuickProductResult> {
  const parsed = quickCreateProductInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { productName, sku, barcode, basePrice } = parsed.data;

  const catalog = await CatalogRequest.resolveDefaults();
  if (!catalog.success) {
    return { ok: false, error: catalog.error, unauthorized: catalog.unauthorized };
  }
  const { unitId, priceListId, defaultStorageId, defaultIvaTaxIds, taxes } = catalog.defaults;

  const productRes = await ProductRequest.createProduct(productName);
  if (!productRes.success) {
    return { ok: false, error: productRes.error, unauthorized: productRes.unauthorized };
  }

  // Precio de venta ingresado = bruto (con IVA) cuando hay IVA activo.
  const gross = roundMoneyInt(basePrice ?? 0);
  const factor = effectiveIvaFactor(taxes, defaultIvaTaxIds);
  const net = grossToNet(gross, factor);
  const saleTaxIds = defaultIvaTaxIds.length > 0 ? [...defaultIvaTaxIds] : undefined;

  const variantRes = await ProductRequest.createVariant({
    productId: productRes.id,
    sku,
    barcode: barcode ?? null,
    basePrice: net,
    unitId,
    taxCategory: "TAX_STANDARD",
    taxIds: saleTaxIds,
    priceListItems: [
      {
        priceListId,
        netPrice: net,
        grossPrice: gross,
        taxIds: saleTaxIds,
      },
    ],
  });

  if (!variantRes.success) {
    return { ok: false, error: variantRes.error, unauthorized: variantRes.unauthorized };
  }

  const stockRes = await StockRequest.ensureStockLevel(variantRes.id, defaultStorageId);
  if (!stockRes.success) {
    return { ok: false, error: stockRes.error, unauthorized: stockRes.unauthorized };
  }

  return { ok: true, variantId: variantRes.id, sku };
}
