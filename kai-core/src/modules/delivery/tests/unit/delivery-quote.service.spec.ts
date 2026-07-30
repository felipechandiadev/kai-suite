import { DeliveryQuoteService } from '../../application/delivery-quote.service';

describe('DeliveryQuoteService', () => {
  const companiesService = {
    getEShopFlatSettings: jest.fn().mockResolvedValue({ eShopFreeShippingThreshold: 50000 }),
  };

  const service = new DeliveryQuoteService(companiesService as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns zone fee when below threshold', async () => {
    const result = await service.quote('company-1', {
      zoneId: 'z1',
      zoneName: 'Talca centro',
      shippingFee: 3500,
      communeCode: 'talca',
    }, 10000);
    expect(result).toEqual({ shippingFee: 3500, freeShippingApplied: false });
  });

  it('applies free shipping when subtotal meets threshold', async () => {
    const result = await service.quote('company-1', {
      zoneId: 'z1',
      zoneName: 'Talca centro',
      shippingFee: 3500,
      communeCode: 'talca',
    }, 60000);
    expect(result).toEqual({ shippingFee: 0, freeShippingApplied: true });
  });

  it('returns zero when zone is null', async () => {
    const result = await service.quote('company-1', null, 10000);
    expect(result).toEqual({ shippingFee: 0, freeShippingApplied: false });
  });
});
