import { BadRequestException } from '@nestjs/common';
import { DeliveryOrderService } from '../../application/delivery-order.service';

describe('DeliveryOrderService create status', () => {
  const save = jest.fn(async (row: unknown) => row);
  const create = jest.fn((data: unknown) => data);
  const findOne = jest.fn();
  const query = jest.fn();
  const orderRepo = { save, create, findOne };
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

  it('completeCourierStop bridges READY_FOR_DISPATCH → IN_TRANSIT → DELIVERED', async () => {
    findOne
      .mockResolvedValueOnce({
        id: 'o1',
        companyId: 'c1',
        deliveryStatus: 'READY_FOR_DISPATCH',
      })
      .mockResolvedValueOnce({
        id: 'o1',
        companyId: 'c1',
        deliveryStatus: 'READY_FOR_DISPATCH',
      })
      .mockResolvedValueOnce({
        id: 'o1',
        companyId: 'c1',
        deliveryStatus: 'IN_TRANSIT',
      });
    save.mockImplementation(async (row) => row);

    const result = await service.completeCourierStop('c1', 'o1', 'DELIVERED');
    expect(result.deliveryStatus).toBe('DELIVERED');
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ deliveryStatus: 'IN_TRANSIT' }),
    );
    expect(save).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ deliveryStatus: 'DELIVERED' }),
    );
  });

  it('completeCourierStop rejects invalid jumps from PREPARING', async () => {
    findOne.mockResolvedValue({
      id: 'o1',
      companyId: 'c1',
      deliveryStatus: 'PREPARING',
    });
    await expect(service.completeCourierStop('c1', 'o1', 'DELIVERED')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
