import { BadRequestException } from '@nestjs/common';
import { DeliveryOrderLinePickingService } from '../../application/delivery-order-line-picking.service';

describe('DeliveryOrderLinePickingService', () => {
  const orderRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const pickRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((v) => v),
    save: jest.fn(async (v) => v),
  };
  const lineRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const service = new DeliveryOrderLinePickingService(
    orderRepo as any,
    pickRepo as any,
    lineRepo as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('toggles line picked when line belongs to order', async () => {
    orderRepo.findOne.mockResolvedValue({
      id: 'ord-1',
      companyId: 'c1',
      transactionId: 'tx-1',
      deliveryStatus: 'PREPARING',
    });
    lineRepo.findOne.mockResolvedValue({
      id: 'line-1',
      companyId: 'c1',
      transactionId: 'tx-1',
    });
    pickRepo.findOne.mockResolvedValue(null);

    const result = await service.toggleLinePicked('c1', 'ord-1', 'line-1', true, 'user-1');
    expect(result.isPicked).toBe(true);
    expect(result.pickedByUserId).toBe('user-1');
  });

  it('rejects line that does not belong to order', async () => {
    orderRepo.findOne.mockResolvedValue({
      id: 'ord-1',
      companyId: 'c1',
      transactionId: 'tx-1',
      deliveryStatus: 'PREPARING',
    });
    lineRepo.findOne.mockResolvedValue(null);

    await expect(
      service.toggleLinePicked('c1', 'ord-1', 'line-x', true),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects picking delivered orders', async () => {
    orderRepo.findOne.mockResolvedValue({
      id: 'ord-1',
      companyId: 'c1',
      transactionId: 'tx-1',
      deliveryStatus: 'DELIVERED',
    });

    await expect(
      service.toggleLinePicked('c1', 'ord-1', 'line-1', true),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
