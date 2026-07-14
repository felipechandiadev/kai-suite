import { BadRequestException } from '@nestjs/common';
import { DeliveryOccurrenceService } from '../../application/delivery-occurrence.service';

type OccurrenceRow = {
  id: string;
  companyId: string;
  name: string;
  occurrenceDate: string;
  departureTime: string;
  orderCutoffTime: string;
  maxOrders: number | null;
  driverUserId: string | null;
  isCancelled: boolean;
  routeStatus: string;
};

describe('DeliveryOccurrenceService', () => {
  const companyId = 'company-1';

  let occurrences: OccurrenceRow[];
  let links: Array<{ companyId: string; occurrenceId: string; zoneId: string }>;
  let orders: Array<{
    companyId: string;
    deliveryOccurrenceId: string;
    deliveryZoneId: string | null;
  }>;
  let zones: Array<{ id: string; companyId: string; name: string; isActive: boolean }>;

  const occurrenceRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((v: Partial<OccurrenceRow>) => ({ ...v })),
    save: jest.fn(),
  };

  const occurrenceZoneRepo = {
    find: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    create: jest.fn((v: unknown) => v),
  };

  const deliveryOrderRepo = {
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const zoneRepo = {
    find: jest.fn(),
  };

  const service = new DeliveryOccurrenceService(
    occurrenceRepo as any,
    occurrenceZoneRepo as any,
    deliveryOrderRepo as any,
    zoneRepo as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    occurrences = [];
    links = [];
    orders = [];
    zones = [
      { id: 'z1', companyId, name: 'Talca centro', isActive: true },
      { id: 'z2', companyId, name: 'Maule', isActive: true },
      { id: 'z3', companyId, name: 'Inactiva', isActive: false },
    ];

    occurrenceRepo.find.mockImplementation(async ({ where }: any) => {
      return occurrences.filter((o) => {
        if (o.companyId !== where.companyId) return false;
        if (where.occurrenceDate?._type === 'between') {
          const [from, to] = where.occurrenceDate._value;
          return o.occurrenceDate >= from && o.occurrenceDate <= to;
        }
        return true;
      });
    });

    occurrenceRepo.findOne.mockImplementation(async ({ where }: any) => {
      return (
        occurrences.find(
          (o) =>
            o.companyId === where.companyId &&
            o.id === where.id &&
            (where.isCancelled === undefined || o.isCancelled === where.isCancelled),
        ) ?? null
      );
    });

    occurrenceRepo.save.mockImplementation(async (row: OccurrenceRow) => {
      if (!row.id) {
        const created = { ...row, id: `occ-${occurrences.length + 1}` };
        occurrences.push(created);
        return created;
      }
      const idx = occurrences.findIndex((o) => o.id === row.id);
      if (idx >= 0) occurrences[idx] = { ...row };
      else occurrences.push(row);
      return row;
    });

    occurrenceZoneRepo.find.mockImplementation(async ({ where }: any) => {
      return links.filter((l) => {
        if (l.companyId !== where.companyId) return false;
        if (where.occurrenceId?._type === 'in') {
          return where.occurrenceId._value.includes(l.occurrenceId);
        }
        if (where.occurrenceId) return l.occurrenceId === where.occurrenceId;
        return true;
      });
    });

    occurrenceZoneRepo.save.mockImplementation(async (rows: any) => {
      const list = Array.isArray(rows) ? rows : [rows];
      for (const row of list) links.push(row);
      return list;
    });

    occurrenceZoneRepo.delete.mockImplementation(async (where: any) => {
      links = links.filter(
        (l) =>
          !(l.companyId === where.companyId && l.occurrenceId === where.occurrenceId),
      );
      return { affected: 1 };
    });

    zoneRepo.find.mockImplementation(async ({ where }: any) => {
      return zones.filter((z) => {
        if (z.companyId !== where.companyId) return false;
        if (where.id?._type === 'in') return where.id._value.includes(z.id);
        if (where.id) return z.id === where.id;
        return true;
      });
    });

    deliveryOrderRepo.count.mockImplementation(async ({ where }: any) => {
      return orders.filter((o) => {
        if (o.companyId !== where.companyId) return false;
        if (
          where.deliveryOccurrenceId &&
          o.deliveryOccurrenceId !== where.deliveryOccurrenceId
        ) {
          return false;
        }
        if (where.deliveryZoneId?._type === 'in') {
          return where.deliveryZoneId._value.includes(o.deliveryZoneId);
        }
        return true;
      }).length;
    });

    deliveryOrderRepo.createQueryBuilder.mockImplementation(() => {
      const state: { ids?: string[] } = {};
      const qb = {
        select: () => qb,
        addSelect: () => qb,
        where: () => qb,
        andWhere: (_sql: string, params: { ids?: string[] }) => {
          state.ids = params.ids;
          return qb;
        },
        groupBy: () => qb,
        getRawMany: async () => {
          const counts = new Map<string, number>();
          for (const o of orders) {
            if (!state.ids?.includes(o.deliveryOccurrenceId)) continue;
            counts.set(
              o.deliveryOccurrenceId,
              (counts.get(o.deliveryOccurrenceId) ?? 0) + 1,
            );
          }
          return [...counts.entries()].map(([occurrenceId, count]) => ({
            occurrenceId,
            count: String(count),
          }));
        },
      };
      return qb;
    });
  });

  it('lists occurrences with zones and order counts', async () => {
    occurrences.push({
      id: 'occ-1',
      companyId,
      name: 'Salida tarde',
      occurrenceDate: '2026-07-14',
      departureTime: '15:00:00',
      orderCutoffTime: '13:00:00',
      maxOrders: 20,
      driverUserId: null,
      isCancelled: false,
      routeStatus: 'planned',
    });
    links.push({ companyId, occurrenceId: 'occ-1', zoneId: 'z1' });
    orders.push({
      companyId,
      deliveryOccurrenceId: 'occ-1',
      deliveryZoneId: 'z1',
    });

    const rows = await service.listAdmin(companyId, '2026-07-14', '2026-07-14');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 'occ-1',
      departureTime: '15:00',
      orderCutoffTime: '13:00',
      zoneIds: ['z1'],
      zones: [{ id: 'z1', name: 'Talca centro' }],
      orderCount: 1,
      availableSlots: 19,
      canEdit: true,
      canCancel: true,
    });
  });

  it('creates occurrence with multiple zones', async () => {
    const row = await service.create(companyId, {
      name: 'Mañana',
      occurrenceDate: '2026-07-15',
      departureTime: '10:00',
      orderCutoffTime: '09:00',
      maxOrders: 15,
      zoneIds: ['z1', 'z2'],
    });

    expect(row.name).toBe('Mañana');
    expect(row.zoneIds.sort()).toEqual(['z1', 'z2']);
    expect(links).toHaveLength(2);
  });

  it('updates occurrence and replaces zone links', async () => {
    occurrences.push({
      id: 'occ-1',
      companyId,
      name: 'Salida',
      occurrenceDate: '2026-07-14',
      departureTime: '15:00:00',
      orderCutoffTime: '13:00:00',
      maxOrders: 20,
      driverUserId: null,
      isCancelled: false,
      routeStatus: 'planned',
    });
    links.push({ companyId, occurrenceId: 'occ-1', zoneId: 'z1' });

    const row = await service.update(companyId, 'occ-1', {
      name: 'Salida actualizada',
      departureTime: '16:00',
      orderCutoffTime: '14:00',
      zoneIds: ['z2'],
    });

    expect(row.name).toBe('Salida actualizada');
    expect(row.departureTime).toBe('16:00');
    expect(row.zoneIds).toEqual(['z2']);
    expect(links).toEqual([
      { companyId, occurrenceId: 'occ-1', zoneId: 'z2' },
    ]);
  });

  it('cancels occurrence', async () => {
    occurrences.push({
      id: 'occ-1',
      companyId,
      name: 'Salida',
      occurrenceDate: '2026-07-14',
      departureTime: '15:00:00',
      orderCutoffTime: '13:00:00',
      maxOrders: null,
      driverUserId: null,
      isCancelled: false,
      routeStatus: 'planned',
    });

    const row = await service.cancel(companyId, 'occ-1');
    expect(row.isCancelled).toBe(true);
    expect(row.routeStatus).toBe('cancelled');
    expect(row.canCancel).toBe(false);
  });

  it('rejects maxOrders below orderCount', async () => {
    occurrences.push({
      id: 'occ-1',
      companyId,
      name: 'Salida',
      occurrenceDate: '2026-07-14',
      departureTime: '15:00:00',
      orderCutoffTime: '13:00:00',
      maxOrders: 20,
      driverUserId: null,
      isCancelled: false,
      routeStatus: 'planned',
    });
    links.push({ companyId, occurrenceId: 'occ-1', zoneId: 'z1' });
    orders.push(
      {
        companyId,
        deliveryOccurrenceId: 'occ-1',
        deliveryZoneId: 'z1',
      },
      {
        companyId,
        deliveryOccurrenceId: 'occ-1',
        deliveryZoneId: 'z1',
      },
      {
        companyId,
        deliveryOccurrenceId: 'occ-1',
        deliveryZoneId: 'z1',
      },
    );

    await expect(
      service.update(companyId, 'occ-1', { maxOrders: 2, zoneIds: ['z1'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects edit/cancel when route is completed', async () => {
    occurrences.push({
      id: 'occ-1',
      companyId,
      name: 'Salida',
      occurrenceDate: '2026-07-14',
      departureTime: '15:00:00',
      orderCutoffTime: '13:00:00',
      maxOrders: null,
      driverUserId: null,
      isCancelled: false,
      routeStatus: 'completed',
    });

    await expect(
      service.update(companyId, 'occ-1', { name: 'X', zoneIds: ['z1'] }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(service.cancel(companyId, 'occ-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
