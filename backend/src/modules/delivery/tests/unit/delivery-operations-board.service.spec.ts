import { NotFoundException } from '@nestjs/common';
import { DeliveryOperationsBoardService } from '../../application/delivery-operations-board.service';

describe('DeliveryOperationsBoardService', () => {
  const occurrenceRepo = { find: jest.fn(), findOne: jest.fn() };
  const occurrenceZoneRepo = { find: jest.fn() };
  const orderRepo = { find: jest.fn() };
  const zoneRepo = { find: jest.fn() };
  const stopRepo = { count: jest.fn() };
  const dispatchRepo = { findOne: jest.fn() };
  const lineRepo = { find: jest.fn() };
  const userRepo = { findOne: jest.fn() };
  const picking = { getPicksForOrders: jest.fn() };
  const couriers = { formatLabel: jest.fn() };

  const service = new DeliveryOperationsBoardService(
    occurrenceRepo as any,
    occurrenceZoneRepo as any,
    orderRepo as any,
    zoneRepo as any,
    stopRepo as any,
    dispatchRepo as any,
    lineRepo as any,
    userRepo as any,
    picking as any,
    couriers as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    occurrenceZoneRepo.find.mockResolvedValue([]);
    zoneRepo.find.mockResolvedValue([]);
    dispatchRepo.findOne.mockResolvedValue(null);
    stopRepo.count.mockResolvedValue(0);
    userRepo.findOne.mockResolvedValue(null);
    couriers.formatLabel.mockReturnValue(null);
    picking.getPicksForOrders.mockResolvedValue([]);
    lineRepo.find.mockResolvedValue([]);
  });

  it('returns empty board when date has no occurrences', async () => {
    occurrenceRepo.find.mockResolvedValue([]);

    const board = await service.getBoard('company-1', { date: '2026-07-13' });

    expect(board).toEqual({
      date: '2026-07-13',
      occurrence: null,
      ordersByStatus: {},
      totals: {},
      submittedCount: 0,
    });
  });

  it('groups orders by status and includes line pick counts', async () => {
    occurrenceRepo.find.mockResolvedValue([
      {
        id: 'occ-1',
        name: 'Reparto PM',
        occurrenceDate: '2026-07-13',
        departureTime: '18:00:00',
        orderCutoffTime: '16:00:00',
        maxOrders: null,
        driverUserId: null,
        isCancelled: false,
        routeStatus: 'planned',
        totalDistanceM: null,
        totalDurationS: null,
        routeOptimizedAt: null,
        routeStartedAt: null,
        routeCompletedAt: null,
      },
    ]);
    orderRepo.find.mockResolvedValue([
      {
        id: 'ord-1',
        transactionId: 'tx-1',
        deliveryStatus: 'CONFIRMED',
        customerName: 'Ana',
        customerPhone: '911',
        commune: 'Talca',
        addressLine1: 'Calle 1',
        shippingFee: 1500,
        notes: null,
        createdAt: new Date('2026-07-13T10:00:00Z'),
      },
      {
        id: 'ord-2',
        transactionId: 'tx-2',
        deliveryStatus: 'SUBMITTED',
        customerName: 'Bob',
        customerPhone: null,
        commune: 'Talca',
        addressLine1: 'Calle 2',
        shippingFee: 0,
        notes: null,
        createdAt: new Date('2026-07-13T11:00:00Z'),
      },
    ]);
    lineRepo.find.mockResolvedValue([
      {
        id: 'line-1',
        transactionId: 'tx-1',
        companyId: 'company-1',
        productName: 'Pan',
        variantName: 'Integral',
        productSku: 'SKU1',
        quantity: 2,
        unitPrice: 1000,
        total: 2000,
        lineNumber: 1,
      },
      {
        id: 'line-2',
        transactionId: 'tx-1',
        companyId: 'company-1',
        productName: 'Leche',
        variantName: null,
        productSku: null,
        quantity: 1,
        unitPrice: 900,
        total: 900,
        lineNumber: 2,
      },
    ]);
    picking.getPicksForOrders.mockResolvedValue([
      { deliveryOrderId: 'ord-1', transactionLineId: 'line-1', isPicked: true },
    ]);

    const board = await service.getBoard('company-1', { date: '2026-07-13' });

    expect(board.occurrence?.id).toBe('occ-1');
    expect(board.submittedCount).toBe(1);
    expect(board.totals.CONFIRMED).toBe(1);
    expect(board.totals.SUBMITTED).toBe(1);
    expect(board.ordersByStatus.CONFIRMED).toHaveLength(1);
    expect(board.ordersByStatus.SUBMITTED).toBeUndefined();

    const order = board.ordersByStatus.CONFIRMED![0];
    expect(order.lineCount).toBe(2);
    expect(order.pickedCount).toBe(1);
    expect(order.lines[0].isPicked).toBe(true);
    expect(order.lines[1].isPicked).toBe(false);
    expect(order.itemsSummary).toContain('Pan');
  });

  it('filters orders by search', async () => {
    occurrenceRepo.find.mockResolvedValue([
      {
        id: 'occ-1',
        name: 'Reparto',
        occurrenceDate: '2026-07-13',
        departureTime: '18:00:00',
        orderCutoffTime: '16:00:00',
        maxOrders: null,
        driverUserId: null,
        isCancelled: false,
        routeStatus: 'planned',
        totalDistanceM: null,
        totalDurationS: null,
        routeOptimizedAt: null,
        routeStartedAt: null,
        routeCompletedAt: null,
      },
    ]);
    orderRepo.find.mockResolvedValue([
      {
        id: 'ord-1',
        transactionId: 'tx-1',
        deliveryStatus: 'PREPARING',
        customerName: 'Ana López',
        customerPhone: '911',
        commune: 'Talca',
        addressLine1: 'Calle 1',
        shippingFee: 0,
        notes: null,
        createdAt: new Date('2026-07-13T10:00:00Z'),
      },
      {
        id: 'ord-2',
        transactionId: 'tx-2',
        deliveryStatus: 'PREPARING',
        customerName: 'Carlos',
        customerPhone: '922',
        commune: 'Curicó',
        addressLine1: 'Calle 2',
        shippingFee: 0,
        notes: null,
        createdAt: new Date('2026-07-13T11:00:00Z'),
      },
    ]);

    const board = await service.getBoard('company-1', {
      date: '2026-07-13',
      search: 'carlos',
    });

    expect(board.ordersByStatus.PREPARING).toHaveLength(1);
    expect(board.ordersByStatus.PREPARING![0].id).toBe('ord-2');
  });

  it('throws when occurrenceId is not found', async () => {
    occurrenceRepo.find.mockResolvedValue([]);
    occurrenceRepo.findOne.mockResolvedValue(null);

    await expect(
      service.getBoard('company-1', {
        date: '2026-07-13',
        occurrenceId: 'missing',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
