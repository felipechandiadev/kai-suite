import { BadRequestException } from '@nestjs/common';
import { DeliveryDispatchService } from '../../application/delivery-dispatch.service';

describe('DeliveryDispatchService occurrence route actions', () => {
  const dispatchRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((v) => ({ id: 'd1', ...v })),
    save: jest.fn(async (v) => ({ id: 'd1', ...v })),
    findOneOrFail: jest.fn(),
  };
  const stopRepo = {
    find: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
    save: jest.fn(),
    create: jest.fn((v) => v),
  };
  const deliveryOrderRepo = {
    find: jest.fn(),
    save: jest.fn(),
  };
  const occurrenceRepo = {
    findOne: jest.fn(),
    save: jest.fn(async (v) => v),
    findOneOrFail: jest.fn(),
  };
  const deliveryOrderService = {
    assignToDispatch: jest.fn(),
    updateStatus: jest.fn(async (_c: string, id: string, status: string) => ({
      id,
      deliveryStatus: status,
    })),
  };
  const couriers = {
    assertIsCourier: jest.fn(),
    formatLabel: jest.fn(),
  };

  const service = new DeliveryDispatchService(
    dispatchRepo as any,
    stopRepo as any,
    deliveryOrderRepo as any,
    occurrenceRepo as any,
    deliveryOrderService as any,
    couriers as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('assigns courier driver to occurrence and dispatch', async () => {
    occurrenceRepo.findOne.mockResolvedValue({
      id: 'occ-1',
      companyId: 'c1',
      name: 'Tarde',
      isCancelled: false,
      routeStatus: 'planned',
      driverUserId: null,
    });
    dispatchRepo.findOne.mockResolvedValue({
      id: 'd1',
      companyId: 'c1',
      occurrenceId: 'occ-1',
      driverUserId: null,
    });
    couriers.assertIsCourier.mockResolvedValue({ id: 'driver-1' });

    const result = await service.assignDriverToOccurrence('c1', 'occ-1', 'driver-1');
    expect(couriers.assertIsCourier).toHaveBeenCalledWith('c1', 'driver-1');
    expect(result.driverUserId).toBe('driver-1');
  });

  it('fails start readiness when not optimized', async () => {
    occurrenceRepo.findOne.mockResolvedValue({
      id: 'occ-1',
      companyId: 'c1',
      isCancelled: false,
      routeStatus: 'planned',
      driverUserId: 'driver-1',
    });
    deliveryOrderRepo.find.mockResolvedValue([
      { deliveryStatus: 'READY_FOR_DISPATCH' },
    ]);
    dispatchRepo.findOne.mockResolvedValue({ id: 'd1' });
    stopRepo.count.mockResolvedValue(0);

    const readiness = await service.evaluateStartReadiness('c1', 'occ-1');
    expect(readiness.canStart).toBe(false);
    expect(readiness.reason).toMatch(/Optimiza la ruta/i);
  });

  it('starts route when readiness passes', async () => {
    occurrenceRepo.findOne.mockResolvedValue({
      id: 'occ-1',
      companyId: 'c1',
      isCancelled: false,
      routeStatus: 'route_ready',
      driverUserId: 'driver-1',
    });
    deliveryOrderRepo.find
      .mockResolvedValueOnce([{ deliveryStatus: 'READY_FOR_DISPATCH' }]) // readiness
      .mockResolvedValueOnce([
        { id: 'o1', deliveryStatus: 'READY_FOR_DISPATCH', deliveryDispatchId: 'd1' },
      ]); // start() linked orders
    dispatchRepo.findOne.mockResolvedValue({
      id: 'd1',
      companyId: 'c1',
      occurrenceId: 'occ-1',
      driverUserId: 'driver-1',
      status: 'route_ready',
    });
    stopRepo.count.mockResolvedValue(2);
    stopRepo.find.mockResolvedValue([{ deliveryOrderId: 'o1' }]);
    deliveryOrderRepo.save.mockImplementation(async (v) => v);

    const result = await service.startOccurrenceRoute('c1', 'occ-1');
    expect(result.status).toBe('out');
    expect(deliveryOrderService.updateStatus).toHaveBeenCalledWith(
      'c1',
      'o1',
      'IN_TRANSIT',
    );
  });

  it('rejects start when driver missing', async () => {
    occurrenceRepo.findOne.mockResolvedValue({
      id: 'occ-1',
      companyId: 'c1',
      isCancelled: false,
      routeStatus: 'route_ready',
      driverUserId: null,
    });
    await expect(service.startOccurrenceRoute('c1', 'occ-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
