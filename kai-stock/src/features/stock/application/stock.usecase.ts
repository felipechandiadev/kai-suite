import { adjustStockInputSchema } from "../domain/adjust-stock.entity";
import { transferStockInputSchema } from "../domain/transfer-stock.entity";
import { StockRequest } from "../infrastructure/stock.request";

export async function getVariantStockUseCase(variantId: string, sku?: string) {
  return StockRequest.getVariantStock(variantId, sku);
}

export async function listStoragesUseCase() {
  return StockRequest.listStorages();
}

export async function adjustStockUseCase(input: {
  variantId: string;
  storageId: string;
  currentQuantity: number;
  targetQuantity: number;
  note?: string;
}) {
  const parsed = adjustStockInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  return StockRequest.adjust(parsed.data);
}

export async function transferStockUseCase(input: {
  variantId: string;
  sourceStorageId: string;
  targetStorageId: string;
  quantity: number;
  note?: string;
}) {
  const parsed = transferStockInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  return StockRequest.transfer(parsed.data);
}
