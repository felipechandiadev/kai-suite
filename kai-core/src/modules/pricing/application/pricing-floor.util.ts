import { ProductType } from '@modules/products/domain/product.entity';
import { resolveFrozenSaleUnitCost } from '@modules/product-variants/application/helpers/sale-unit-cost.util';

const FINISHED_PRODUCT_TYPES = new Set<ProductType>([
  ProductType.MANUFACTURADO,
  ProductType.ELABORADO,
  ProductType.PREPARADO,
]);

/**
 * Piso técnico para pricing: elaborados solo usan PMP (no baseCost estático).
 * CTP en UI futura; sin PMP → 0 → alerta INSUFFICIENT_DATA.
 */
export function resolvePricingFloorNet(
  variant: { pmp?: number | null; baseCost?: number | null },
  productType: ProductType,
): number {
  if (FINISHED_PRODUCT_TYPES.has(productType)) {
    const pmp = Number(variant.pmp);
    if (Number.isFinite(pmp) && pmp > 0) {
      return Number(pmp.toFixed(2));
    }
    return 0;
  }
  return resolveFrozenSaleUnitCost(variant);
}
