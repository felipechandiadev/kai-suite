import { BadRequestException } from '@nestjs/common';
import { OptimizeDeliveryDispatchRouteService } from '../../application/optimize-delivery-dispatch-route.service';

describe('OptimizeDeliveryDispatchRouteService', () => {
  const dispatchRepo = {
    findOne: jest.fn(),
  };
  const deliveryOrderRepo = {
    find: jest.fn(),
  };
  const settingsRepo = {
    findOne: jest.fn(),
  };
  const dispatchService = {
    assignOrders: jest.fn(),
    saveOptimizedStops: jest.fn(async (_c: string, _d: string, stops: unknown[], route: unknown) => ({
      id: 'dispatch-1',
      stops,
      route,
    })),
  };
  const osrm = {
    trip: jest.fn(),
  };

  const service = new OptimizeDeliveryDispatchRouteService(
    dispatchRepo as any,
    deliveryOrderRepo as any,
    settingsRepo as any,
    dispatchService as any,
    osrm as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses fallback plan when OSRM is unavailable', async () => {
    dispatchRepo.findOne.mockResolvedValue({
      id: 'dispatch-1',
      companyId: 'c1',
      occurrenceId: 'occ-1',
    });
    settingsRepo.findOne.mockResolvedValue({
      companyId: 'c1',
      depotLat: -36.1315,
      depotLng: -71.8188,
      osrmUrl: 'http://localhost:5001',
    });
    deliveryOrderRepo.find.mockResolvedValue([
      {
        id: 'o1',
        transactionId: 't1',
        latitude: -36.138,
        longitude: -71.819,
        deliveryStatus: 'READY_FOR_DISPATCH',
      },
      {
        id: 'o2',
        transactionId: 't2',
        latitude: -36.145,
        longitude: -71.832,
        deliveryStatus: 'READY_FOR_DISPATCH',
      },
    ]);
    osrm.trip.mockResolvedValue(null);

    const result = await service.optimize('c1', 'dispatch-1');

    expect(dispatchService.assignOrders).toHaveBeenCalledWith('c1', 'dispatch-1', ['o1', 'o2']);
    expect(dispatchService.saveOptimizedStops).toHaveBeenCalledWith(
      'c1',
      'dispatch-1',
      expect.any(Array),
      expect.objectContaining({
        totalDistanceM: expect.any(Number),
        totalDurationS: expect.any(Number),
        routeGeometry: expect.objectContaining({ type: 'LineString' }),
      }),
    );
    expect(result.routingEngine).toBe('fallback');
    expect(result.stopCount).toBe(2);
    expect(result.warning).toMatch(/OSRM no disponible/i);
  });

  it('rejects optimize when depot is missing', async () => {
    dispatchRepo.findOne.mockResolvedValue({
      id: 'dispatch-1',
      companyId: 'c1',
      occurrenceId: 'occ-1',
    });
    settingsRepo.findOne.mockResolvedValue({ companyId: 'c1', depotLat: null, depotLng: null });

    await expect(service.optimize('c1', 'dispatch-1')).rejects.toBeInstanceOf(BadRequestException);
  });
});
