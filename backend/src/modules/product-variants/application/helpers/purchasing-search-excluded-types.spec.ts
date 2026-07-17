import { ProductType } from '@modules/products/domain/product.entity';
import { PURCHASING_SEARCH_EXCLUDED_PRODUCT_TYPES } from '@modules/product-variants/application/helpers/purchasing-search-excluded-types';

describe('PURCHASING_SEARCH_EXCLUDED_PRODUCT_TYPES', () => {
  it('excludes finished goods, SERVICE and DIGITAL', () => {
    expect(PURCHASING_SEARCH_EXCLUDED_PRODUCT_TYPES).toEqual(
      expect.arrayContaining([
        ProductType.MANUFACTURADO,
        ProductType.ELABORADO,
        ProductType.PREPARADO,
        ProductType.SERVICE,
        ProductType.DIGITAL,
      ]),
    );
    expect(PURCHASING_SEARCH_EXCLUDED_PRODUCT_TYPES).not.toContain(ProductType.PHYSICAL);
  });
});
