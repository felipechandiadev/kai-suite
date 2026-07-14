import { ResolveDeliveryZoneService } from '../../application/resolve-delivery-zone.service';

describe('ResolveDeliveryZoneService', () => {
  const dataSource = { query: jest.fn() };
  const coverage = {
    getEnabledCommuneCodes: jest.fn().mockResolvedValue(new Set(['talca'])),
  };

  const service = new ResolveDeliveryZoneService(dataSource as any, coverage as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolveByZoneId returns active zone', async () => {
    dataSource.query.mockResolvedValueOnce([
      { id: 'zone-1', name: 'Talca', shipping_fee: '2500', commune_code: 'talca' },
    ]);
    const zone = await service.resolveByZoneId('c1', 'zone-1');
    expect(zone).toEqual({
      zoneId: 'zone-1',
      zoneName: 'Talca',
      shippingFee: 2500,
      communeCode: 'talca',
    });
  });

  it('resolveByCommuneFallback rejects disabled commune', async () => {
    coverage.getEnabledCommuneCodes.mockResolvedValueOnce(new Set(['curico']));
    const zone = await service.resolveByCommuneFallback('c1', 'talca');
    expect(zone).toBeNull();
  });

  it('resolveByPoint returns null when no polygon matches', async () => {
    dataSource.query.mockResolvedValueOnce([]);
    const zone = await service.resolveByPoint('c1', -35.4, -71.6, 'talca');
    expect(zone).toBeNull();
  });
});
