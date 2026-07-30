import {
  computeVariantStockAlertKinds,
  parseStockAlertsQueryParam,
  stockLevelToThresholdSlice,
} from '../../variant-stock-alert.util';

describe('parseStockAlertsQueryParam', () => {
  it('accepts common truthy strings', () => {
    expect(parseStockAlertsQueryParam('true')).toBe(true);
    expect(parseStockAlertsQueryParam('1')).toBe(true);
    expect(parseStockAlertsQueryParam('yes')).toBe(true);
  });

  it('rejects empty and false', () => {
    expect(parseStockAlertsQueryParam(undefined)).toBe(false);
    expect(parseStockAlertsQueryParam('false')).toBe(false);
  });
});

describe('computeVariantStockAlertKinds', () => {
  const variant = {
    id: 'v1',
    minimumStock: 10,
    minimumStockEnabled: true,
    maximumStock: 100,
    maximumStockEnabled: false,
    reorderPoint: 5,
    reorderPointEnabled: false,
  };

  it('returns below_minimum when storage qty is under min', () => {
    const kinds = computeVariantStockAlertKinds(variant, [
      stockLevelToThresholdSlice({
        productVariantId: 'v1',
        storageId: 's1',
        physicalStock: 3,
        minimumStock: null,
        minimumStockEnabled: null,
      }),
    ]);
    expect(kinds).toContain('below_minimum');
  });

  it('includes reorder when storage-level reorder is enabled and qty is low', () => {
    const kinds = computeVariantStockAlertKinds(
      {
        minimumStock: 0,
        minimumStockEnabled: false,
        maximumStock: 0,
        maximumStockEnabled: false,
        reorderPoint: 0,
        reorderPointEnabled: false,
      },
      [
        stockLevelToThresholdSlice({
          productVariantId: 'v1',
          storageId: 's1',
          physicalStock: 50,
          reorderPoint: 100,
          reorderPointEnabled: true,
        }),
        stockLevelToThresholdSlice({
          productVariantId: 'v1',
          storageId: 's2',
          physicalStock: 500,
        }),
      ],
    );
    expect(kinds).toContain('reorder');
  });

  it('filters by storageId when requested', () => {
    const levels = [
      stockLevelToThresholdSlice({
        productVariantId: 'v1',
        storageId: 'ok',
        physicalStock: 50,
      }),
      stockLevelToThresholdSlice({
        productVariantId: 'v1',
        storageId: 'bad',
        physicalStock: 2,
        minimumStock: 10,
        minimumStockEnabled: true,
      }),
    ];
    expect(
      computeVariantStockAlertKinds(variant, levels, { filterStorageId: 'ok' }),
    ).toEqual([]);
    expect(
      computeVariantStockAlertKinds(variant, levels, { filterStorageId: 'bad' }),
    ).toContain('below_minimum');
  });
});
