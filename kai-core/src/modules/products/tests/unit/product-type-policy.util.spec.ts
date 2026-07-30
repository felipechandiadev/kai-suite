import { ProductType } from '@modules/products/domain/product.entity';
import {
  isInsumoProductType,
  isSellableProductType,
} from './product-type-policy.util';

describe('product-type-policy.util', () => {
  it('marks INSUMO as non-sellable', () => {
    expect(isSellableProductType(ProductType.INSUMO)).toBe(false);
    expect(isInsumoProductType(ProductType.INSUMO)).toBe(true);
  });

  it('marks retail types as sellable', () => {
    expect(isSellableProductType(ProductType.PHYSICAL)).toBe(true);
    expect(isSellableProductType(ProductType.ELABORADO)).toBe(true);
    expect(isSellableProductType(ProductType.PREPARADO)).toBe(true);
    expect(isSellableProductType('physical')).toBe(true);
  });
});
