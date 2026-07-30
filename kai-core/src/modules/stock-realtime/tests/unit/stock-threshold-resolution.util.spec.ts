import {
  resolveStockThresholds,
  sumVariantPhysicalStock,
} from '../../stock-threshold-resolution.util';

describe('resolveStockThresholds', () => {
  const variant = {
    minimumStock: 80,
    minimumStockEnabled: true,
    maximumStock: 0,
    maximumStockEnabled: false,
    reorderPoint: 0,
    reorderPointEnabled: false,
  };

  it('does not alert when only one storage is 0 but total meets variant minimum', () => {
    const resolved = resolveStockThresholds(variant, {
      storageId: 'deposito',
      productVariantId: 'v1',
      physicalStock: 0,
      minimumStock: null,
      minimumStockEnabled: null,
    }, { totalPhysicalStock: 120 });

    expect(resolved.scope).toBe('variant_total');
    expect(resolved.alerts).toEqual([]);
  });

  it('alerts when variant total is below minimum', () => {
    const resolved = resolveStockThresholds(variant, {
      storageId: 'deposito',
      productVariantId: 'v1',
      physicalStock: 0,
      minimumStock: null,
      minimumStockEnabled: null,
    }, { totalPhysicalStock: 50 });

    expect(resolved.alerts).toEqual(['below_minimum']);
  });

  it('alerts per storage when storage has its own minimum enabled', () => {
    const resolved = resolveStockThresholds(variant, {
      storageId: 'deposito',
      productVariantId: 'v1',
      physicalStock: 50,
      minimumStock: 80,
      minimumStockEnabled: true,
    }, { totalPhysicalStock: 500 });

    expect(resolved.scope).toBe('storage');
    expect(resolved.alerts).toEqual(['below_minimum']);
  });

  it('does not alert when storage explicitly disables minimum', () => {
    const resolved = resolveStockThresholds(variant, {
      storageId: 'deposito',
      productVariantId: 'v1',
      physicalStock: 10,
      minimumStock: null,
      minimumStockEnabled: false,
    }, { totalPhysicalStock: 10 });

    expect(resolved.minEnabled).toBe(false);
    expect(resolved.alerts).toEqual([]);
  });

  it('alerts reorder per storage when only storage reorder is enabled', () => {
    const resolved = resolveStockThresholds(
      {
        minimumStock: 0,
        minimumStockEnabled: false,
        maximumStock: 0,
        maximumStockEnabled: false,
        reorderPoint: 0,
        reorderPointEnabled: false,
      },
      {
        storageId: 'deposito',
        productVariantId: 'v1',
        physicalStock: 50,
        reorderPoint: 100,
        reorderPointEnabled: true,
      },
      { totalPhysicalStock: 500 },
    );

    expect(resolved.scope).toBe('storage');
    expect(resolved.alerts).toEqual(['reorder']);
  });
});

describe('sumVariantPhysicalStock', () => {
  it('sums all storages and applies override', () => {
    const total = sumVariantPhysicalStock(
      [
        { storageId: 'a', physicalStock: 100 },
        { storageId: 'b', physicalStock: 20 },
      ],
      { storageId: 'b', physical: 0 },
    );
    expect(total).toBe(100);
  });
});
