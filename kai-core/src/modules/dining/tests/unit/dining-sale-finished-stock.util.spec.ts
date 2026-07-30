import {
  extractDiningOrderIdFromMetadata,
  shouldSkipFinishedGoodsStockForDiningSale,
} from '../../application/dining-sale-finished-stock.util';
import { ProductType } from '@modules/products/domain/product.entity';

describe('dining-sale-finished-stock.util', () => {
  describe('extractDiningOrderIdFromMetadata', () => {
    it('lee diningOrderId trimmeado', () => {
      expect(
        extractDiningOrderIdFromMetadata({ diningOrderId: '  ord-1  ' }),
      ).toBe('ord-1');
    });

    it('retorna null si falta o está vacío', () => {
      expect(extractDiningOrderIdFromMetadata(null)).toBeNull();
      expect(extractDiningOrderIdFromMetadata({})).toBeNull();
      expect(extractDiningOrderIdFromMetadata({ diningOrderId: '  ' })).toBeNull();
    });
  });

  describe('shouldSkipFinishedGoodsStockForDiningSale', () => {
    it('omite PREPARADO cuando hay diningOrderId', () => {
      expect(
        shouldSkipFinishedGoodsStockForDiningSale({
          diningOrderId: 'ord-1',
          productType: ProductType.PREPARADO,
        }),
      ).toBe(true);
    });

    it('no omite PHYSICAL aunque haya diningOrderId', () => {
      expect(
        shouldSkipFinishedGoodsStockForDiningSale({
          diningOrderId: 'ord-1',
          productType: ProductType.PHYSICAL,
        }),
      ).toBe(false);
    });

    it('no omite PREPARADO sin diningOrderId', () => {
      expect(
        shouldSkipFinishedGoodsStockForDiningSale({
          diningOrderId: null,
          productType: ProductType.PREPARADO,
        }),
      ).toBe(false);
      expect(
        shouldSkipFinishedGoodsStockForDiningSale({
          diningOrderId: '',
          productType: ProductType.PREPARADO,
        }),
      ).toBe(false);
    });

    it('no omite ELABORADO / MANUFACTURADO en dining', () => {
      expect(
        shouldSkipFinishedGoodsStockForDiningSale({
          diningOrderId: 'ord-1',
          productType: ProductType.ELABORADO,
        }),
      ).toBe(false);
      expect(
        shouldSkipFinishedGoodsStockForDiningSale({
          diningOrderId: 'ord-1',
          productType: ProductType.MANUFACTURADO,
        }),
      ).toBe(false);
    });
  });
});
