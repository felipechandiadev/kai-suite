import {
  extractDiningOrderIdFromMetadata,
  shouldSkipFinishedGoodsStockForDiningSale,
  shouldSkipFinishedGoodsStockForPreparadoRetail,
  shouldSkipFinishedGoodsStockForSale,
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

  describe('shouldSkipFinishedGoodsStockForPreparadoRetail', () => {
    it('omite PREPARADO cuando KaiFood está OFF en el POS', () => {
      expect(
        shouldSkipFinishedGoodsStockForPreparadoRetail({
          posKaiFoodEnabled: false,
          productType: ProductType.PREPARADO,
        }),
      ).toBe(true);
    });

    it('no omite cuando KaiFood está ON', () => {
      expect(
        shouldSkipFinishedGoodsStockForPreparadoRetail({
          posKaiFoodEnabled: true,
          productType: ProductType.PREPARADO,
        }),
      ).toBe(false);
    });
  });

  describe('shouldSkipFinishedGoodsStockForSale', () => {
    it('combina dining y retail preparado', () => {
      expect(
        shouldSkipFinishedGoodsStockForSale({
          diningOrderId: 'ord-1',
          posKaiFoodEnabled: true,
          productType: ProductType.PREPARADO,
        }),
      ).toBe(true);
      expect(
        shouldSkipFinishedGoodsStockForSale({
          diningOrderId: null,
          posKaiFoodEnabled: false,
          productType: ProductType.PREPARADO,
        }),
      ).toBe(true);
      expect(
        shouldSkipFinishedGoodsStockForSale({
          diningOrderId: null,
          posKaiFoodEnabled: true,
          productType: ProductType.PREPARADO,
        }),
      ).toBe(false);
    });
  });
});
