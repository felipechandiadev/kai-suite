import { ProductType } from '@modules/products/domain/product.entity';

/**
 * Cobro de cuenta dining: el inventario de platos PREPARADO es reserva + backflush
 * de insumos, no stock de terminado en la sala de venta del POS.
 */
export function extractDiningOrderIdFromMetadata(
  metadata: unknown,
): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const id = String(
    (metadata as Record<string, unknown>).diningOrderId ?? '',
  ).trim();
  return id || null;
}

export function shouldSkipFinishedGoodsStockForDiningSale(params: {
  diningOrderId?: string | null;
  productType?: string | null;
}): boolean {
  const orderId = String(params.diningOrderId ?? '').trim();
  if (!orderId) return false;
  return (
    String(params.productType ?? '')
      .trim()
      .toUpperCase() === ProductType.PREPARADO
  );
}

/** Venta retail PREPARADO con módulo KaiFood OFF en el POS: sin stock de terminado. */
export function shouldSkipFinishedGoodsStockForPreparadoRetail(params: {
  posKaiFoodEnabled?: boolean | null;
  productType?: string | null;
}): boolean {
  if (params.posKaiFoodEnabled !== false) return false;
  return (
    String(params.productType ?? '')
      .trim()
      .toUpperCase() === ProductType.PREPARADO
  );
}

export function shouldSkipFinishedGoodsStockForSale(params: {
  diningOrderId?: string | null;
  posKaiFoodEnabled?: boolean | null;
  productType?: string | null;
}): boolean {
  if (
    shouldSkipFinishedGoodsStockForDiningSale({
      diningOrderId: params.diningOrderId,
      productType: params.productType,
    })
  ) {
    return true;
  }
  return shouldSkipFinishedGoodsStockForPreparadoRetail({
    posKaiFoodEnabled: params.posKaiFoodEnabled,
    productType: params.productType,
  });
}
