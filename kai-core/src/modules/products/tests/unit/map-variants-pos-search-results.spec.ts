import { ProductsPosService } from '@modules/products/application/products-pos.service';
import type { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';

function createService(): ProductsPosService {
  return new ProductsPosService(
    {} as any,
    {} as any,
    {} as any,
    { createQueryBuilder: jest.fn() } as any,
    { find: jest.fn().mockResolvedValue([]) } as any,
    { listByEntity: jest.fn() } as any,
    { getRepository: jest.fn() } as any,
  );
}

function hydratedVariant(): ProductVariant {
  return {
    id: 'v1',
    productId: 'p1',
    sku: 'SKU-001',
    barcode: '780123',
    trackInventory: true,
    stockBaseUnitId: 'u-base',
    saleUnitId: 'u-sale',
    attributeValues: null,
    product: {
      id: 'p1',
      companyId: 'c1',
      name: 'Coca Cola 350ml',
      description: null,
    } as any,
    priceListItems: [
      {
        id: 'pli-1',
        netPrice: 1000,
        grossPrice: 1190,
        taxIds: [],
      } as any,
    ],
    saleUnit: { id: 'u-sale', symbol: 'UN', allowDecimals: false } as any,
    stockBaseUnit: { id: 'u-base', symbol: 'UN' } as any,
  } as unknown as ProductVariant;
}

describe('ProductsPosService.mapVariantsToPosSearchResults', () => {
  it('mapea nombre y precio cuando product y priceListItems están hidratados', async () => {
    const service = createService();
    const results = await (service as any).mapVariantsToPosSearchResults(
      [hydratedVariant()],
      { storageIdsForStock: null },
      { skipMultimedia: true },
    );

    expect(results).toHaveLength(1);
    expect(results[0].productName).toBe('Coca Cola 350ml');
    expect(results[0].unitPrice).toBe(1000);
    expect(results[0].unitPriceWithTax).toBe(1190);
    expect(results[0].sku).toBe('SKU-001');
  });

  it('usa fallback cuando faltan relaciones hidratadas', async () => {
    const service = createService();
    const bare = {
      id: 'v2',
      productId: 'p2',
      sku: 'SKU-002',
      trackInventory: false,
    } as ProductVariant;

    const results = await (service as any).mapVariantsToPosSearchResults(
      [bare],
      { storageIdsForStock: null },
      { skipMultimedia: true },
    );

    expect(results[0].productName).toBe('Producto sin nombre');
    expect(results[0].unitPrice).toBe(0);
    expect(results[0].unitPriceWithTax).toBe(0);
  });
});
