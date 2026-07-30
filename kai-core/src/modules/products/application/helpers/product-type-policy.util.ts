import { ProductType } from '@modules/products/domain/product.entity';

/** Tipos que pueden venderse (POS, eShop, precio de venta). */
const NON_SELLABLE_PRODUCT_TYPES = new Set<ProductType>([ProductType.INSUMO]);

export function isSellableProductType(
  productType: ProductType | string | null | undefined,
): boolean {
  const t = String(productType ?? '')
    .trim()
    .toUpperCase() as ProductType;
  if (!t) return true;
  return !NON_SELLABLE_PRODUCT_TYPES.has(t);
}

export function isInsumoProductType(
  productType: ProductType | string | null | undefined,
): boolean {
  return (
    String(productType ?? '')
      .trim()
      .toUpperCase() === ProductType.INSUMO
  );
}
