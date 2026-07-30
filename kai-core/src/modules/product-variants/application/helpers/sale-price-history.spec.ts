import { recordSalePriceHistory } from './sale-price-history';

describe('recordSalePriceHistory', () => {
  it('records initial prices on variant create', () => {
    const out = recordSalePriceHistory({
      existing: null,
      previousItems: [],
      nextItems: [
        {
          priceListId: 'pl-1',
          priceListName: 'Retail',
          netPrice: 1000,
          grossPrice: 1190,
          taxIds: ['iva-1'],
        },
      ],
      previousBasePrice: 0,
      nextBasePrice: 1000,
      source: 'variant_create',
      userId: 'user-1',
      at: '2026-01-01T00:00:00.000Z',
    });
    expect(out.length).toBeGreaterThanOrEqual(1);
    const row = out.find((e) => e.priceListId === 'pl-1');
    expect(row).toMatchObject({
      newNet: 1000,
      newGross: 1190,
      source: 'variant_create',
      userId: 'user-1',
    });
    expect(row?.previousNet).toBeUndefined();
  });

  it('skips when net, gross and taxes unchanged', () => {
    const existing = recordSalePriceHistory({
      existing: null,
      previousItems: [],
      nextItems: [{ priceListId: 'pl-1', netPrice: 500, grossPrice: 595, taxIds: [] }],
      previousBasePrice: 0,
      nextBasePrice: 500,
      source: 'variant_create',
    });
    const out = recordSalePriceHistory({
      existing,
      previousItems: [{ priceListId: 'pl-1', netPrice: 500, grossPrice: 595, taxIds: [] }],
      nextItems: [{ priceListId: 'pl-1', netPrice: 500, grossPrice: 595, taxIds: [] }],
      previousBasePrice: 500,
      nextBasePrice: 500,
      source: 'catalog_edit',
    });
    expect(out).toHaveLength(existing.length);
  });

  it('records catalog edit when net changes', () => {
    const existing = recordSalePriceHistory({
      existing: null,
      previousItems: [],
      nextItems: [{ priceListId: 'pl-1', netPrice: 100, grossPrice: 119, taxIds: [] }],
      previousBasePrice: 0,
      nextBasePrice: 100,
      source: 'variant_create',
    });
    const out = recordSalePriceHistory({
      existing,
      previousItems: [{ priceListId: 'pl-1', netPrice: 100, grossPrice: 119, taxIds: [] }],
      nextItems: [{ priceListId: 'pl-1', netPrice: 200, grossPrice: 238, taxIds: [] }],
      previousBasePrice: 100,
      nextBasePrice: 200,
      source: 'catalog_edit',
    });
    const edit = out.find((e) => e.source === 'catalog_edit' && e.priceListId === 'pl-1');
    expect(edit).toMatchObject({ previousNet: 100, newNet: 200 });
  });
});
