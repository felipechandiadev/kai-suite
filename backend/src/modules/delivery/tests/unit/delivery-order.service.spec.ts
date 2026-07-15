import { DeliveryOrderService } from '../../application/delivery-order.service';

describe('DeliveryOrderService create status', () => {
  const save = jest.fn(async (row: unknown) => row);
  const create = jest.fn((data: unknown) => data);
  const query = jest.fn();
  const orderRepo = { save, create };
  const dataSource = { query };
  const service = new DeliveryOrderService(orderRepo as any, dataSource as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createFromCheckout defaults to SUBMITTED (eShop review)', async () => {
    await service.createFromCheckout({
      companyId: 'c1',
      transactionId: 't1',
      fulfillmentType: 'LOCAL_DELIVERY',
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ deliveryStatus: 'SUBMITTED', sourceChannel: 'ESHOP' }),
    );
  });

  it('createFromPosSale starts as CONFIRMED (already paid)', async () => {
    await service.createFromPosSale({
      companyId: 'c1',
      transactionId: 't1',
      deliveryZoneId: 'z1',
      deliveryOccurrenceId: 'o1',
      addressLine1: 'Calle 1',
      commune: 'parral',
      latitude: -36.1,
      longitude: -71.8,
      shippingFee: 2500,
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryStatus: 'CONFIRMED',
        sourceChannel: 'POS',
        fulfillmentType: 'LOCAL_DELIVERY',
      }),
    );
  });
});
