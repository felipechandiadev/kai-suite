import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EShopDeliveryDispatch } from '../domain/e-shop-delivery-dispatch.entity';
import { EShopDeliveryStop } from '../domain/e-shop-delivery-stop.entity';
import { EShopDeliveryOrder } from '../domain/e-shop-delivery-order.entity';
import { EShopDeliveryOccurrence } from '../domain/e-shop-delivery-occurrence.entity';
import { DeliveryOrderService } from './delivery-order.service';
import { ListDeliveryCouriersService } from './list-delivery-couriers.service';
import type {
  CourierDispatchListItemDto,
  DeliveryOrderStatus,
} from '../domain/delivery.types';

@Injectable()
export class DeliveryDispatchService {
  constructor(
    @InjectRepository(EShopDeliveryDispatch)
    private readonly dispatchRepo: Repository<EShopDeliveryDispatch>,
    @InjectRepository(EShopDeliveryStop)
    private readonly stopRepo: Repository<EShopDeliveryStop>,
    @InjectRepository(EShopDeliveryOrder)
    private readonly deliveryOrderRepo: Repository<EShopDeliveryOrder>,
    @InjectRepository(EShopDeliveryOccurrence)
    private readonly occurrenceRepo: Repository<EShopDeliveryOccurrence>,
    private readonly deliveryOrderService: DeliveryOrderService,
    private readonly couriers: ListDeliveryCouriersService,
  ) {}

  async create(companyId: string, occurrenceId: string, driverUserId?: string | null) {
    const occurrence = await this.occurrenceRepo.findOne({ where: { companyId, id: occurrenceId } });
    if (!occurrence) throw new BadRequestException('Reparto no encontrado');
    return this.dispatchRepo.save(
      this.dispatchRepo.create({
        companyId,
        occurrenceId,
        driverUserId: driverUserId ?? occurrence.driverUserId,
        label: occurrence.name,
        status: 'planned',
      }),
    );
  }

  async getOrCreateDispatchForOccurrence(companyId: string, occurrenceId: string) {
    const existing = await this.dispatchRepo.findOne({
      where: { companyId, occurrenceId },
      order: { createdAt: 'ASC' },
    });
    if (existing) return existing;
    return this.create(companyId, occurrenceId);
  }

  async assignDriverToOccurrence(
    companyId: string,
    occurrenceId: string,
    driverUserId: string | null,
  ) {
    const occurrence = await this.occurrenceRepo.findOne({
      where: { companyId, id: occurrenceId },
    });
    if (!occurrence) throw new NotFoundException('Reparto no encontrado');
    if (occurrence.isCancelled) {
      throw new BadRequestException('No se puede asignar repartidor a un reparto cancelado');
    }
    if (occurrence.routeStatus === 'out' || occurrence.routeStatus === 'completed') {
      throw new BadRequestException(
        `No se puede cambiar el repartidor en estado "${occurrence.routeStatus}"`,
      );
    }

    if (driverUserId) {
      await this.couriers.assertIsCourier(companyId, driverUserId);
    }

    occurrence.driverUserId = driverUserId;
    await this.occurrenceRepo.save(occurrence);

    const dispatch = await this.getOrCreateDispatchForOccurrence(companyId, occurrenceId);
    dispatch.driverUserId = driverUserId;
    await this.dispatchRepo.save(dispatch);

    return {
      occurrenceId,
      driverUserId,
      dispatchId: dispatch.id,
    };
  }

  async optimizeOccurrenceRoute(
    companyId: string,
    occurrenceId: string,
    optimizeFn: (companyId: string, dispatchId: string) => Promise<unknown>,
  ) {
    const occurrence = await this.requireMutableOccurrence(companyId, occurrenceId);
    const dispatch = await this.getOrCreateDispatchForOccurrence(companyId, occurrenceId);

    if (occurrence.driverUserId && !dispatch.driverUserId) {
      dispatch.driverUserId = occurrence.driverUserId;
      await this.dispatchRepo.save(dispatch);
    }

    const readyOrders = await this.deliveryOrderRepo.find({
      where: {
        companyId,
        deliveryOccurrenceId: occurrenceId,
        deliveryStatus: 'READY_FOR_DISPATCH' as DeliveryOrderStatus,
      },
    });
    for (const order of readyOrders) {
      if (order.deliveryDispatchId !== dispatch.id) {
        await this.deliveryOrderService.assignToDispatch(companyId, order.id, dispatch.id);
      }
    }

    return optimizeFn(companyId, dispatch.id);
  }

  async startOccurrenceRoute(companyId: string, occurrenceId: string) {
    const occurrence = await this.requireMutableOccurrence(companyId, occurrenceId);
    if (!occurrence.driverUserId) {
      throw new BadRequestException('Asigna un repartidor antes de iniciar el reparto');
    }

    const readiness = await this.evaluateStartReadiness(companyId, occurrenceId);
    if (!readiness.canStart) {
      throw new BadRequestException(readiness.reason ?? 'No se puede iniciar el reparto');
    }

    const dispatch = await this.getOrCreateDispatchForOccurrence(companyId, occurrenceId);
    if (!dispatch.driverUserId) {
      dispatch.driverUserId = occurrence.driverUserId;
      await this.dispatchRepo.save(dispatch);
    }

    const started = await this.start(companyId, dispatch.id);
    occurrence.routeStatus = 'out';
    occurrence.routeStartedAt = new Date();
    await this.occurrenceRepo.save(occurrence);
    return started;
  }

  async evaluateStartReadiness(companyId: string, occurrenceId: string) {
    const occurrence = await this.occurrenceRepo.findOne({
      where: { companyId, id: occurrenceId },
    });
    if (!occurrence) throw new NotFoundException('Reparto no encontrado');

    const orders = await this.deliveryOrderRepo.find({
      where: { companyId, deliveryOccurrenceId: occurrenceId },
    });
    const blockingCount = orders.filter((o) =>
      ['SUBMITTED', 'CONFIRMED', 'PREPARING'].includes(o.deliveryStatus),
    ).length;
    const readyCount = orders.filter(
      (o) => o.deliveryStatus === 'READY_FOR_DISPATCH',
    ).length;
    const issueCount = orders.filter((o) => o.deliveryStatus === 'ISSUE').length;

    const dispatch = await this.dispatchRepo.findOne({
      where: { companyId, occurrenceId },
      order: { createdAt: 'ASC' },
    });
    const stopCount = dispatch
      ? await this.stopRepo.count({ where: { companyId, dispatchId: dispatch.id } })
      : 0;

    let reason: string | null = null;
    if (occurrence.isCancelled || !['planned', 'route_ready'].includes(occurrence.routeStatus)) {
      reason = 'El reparto no puede iniciarse en su estado actual';
    } else if (!occurrence.driverUserId) {
      reason = 'Asigna un repartidor antes de iniciar el reparto';
    } else if (blockingCount > 0) {
      reason =
        blockingCount === 1
          ? '1 pedido aún en preparación'
          : `${blockingCount} pedidos aún en preparación`;
    } else if (readyCount === 0) {
      reason = 'No hay pedidos listos para reparto';
    } else if (stopCount === 0) {
      reason = 'Optimiza la ruta antes de iniciar el reparto';
    }

    return {
      canStart: reason === null,
      reason,
      blockingCount,
      readyCount,
      issueCount,
      stopCount,
    };
  }

  async listByOccurrence(companyId: string, occurrenceId: string) {
    return this.dispatchRepo.find({
      where: { companyId, occurrenceId },
      order: { createdAt: 'ASC' },
    });
  }

  async assignOrders(companyId: string, dispatchId: string, deliveryOrderIds: string[]) {
    for (const id of deliveryOrderIds) {
      await this.deliveryOrderService.assignToDispatch(companyId, id, dispatchId);
    }
    return this.listStops(companyId, dispatchId);
  }

  async listStops(companyId: string, dispatchId: string) {
    return this.stopRepo.find({
      where: { companyId, dispatchId },
      order: { sequence: 'ASC' },
    });
  }

  async listForCourier(
    companyId: string,
    userId: string,
    date: string,
  ): Promise<CourierDispatchListItemDto[]> {
    const dispatches = await this.dispatchRepo
      .createQueryBuilder('d')
      .innerJoin(
        EShopDeliveryOccurrence,
        'o',
        'o.id = d.occurrenceId AND o.companyId = d.companyId',
      )
      .where('d.companyId = :companyId', { companyId })
      .andWhere('d.driverUserId = :userId', { userId })
      .andWhere('o.occurrenceDate = :date', { date })
      .orderBy('o.departureTime', 'ASC')
      .addOrderBy('d.createdAt', 'ASC')
      .getMany();

    if (dispatches.length === 0) return [];

    const dispatchIds = dispatches.map((d) => d.id);
    const occurrenceIds = [...new Set(dispatches.map((d) => d.occurrenceId))];

    const occurrences = await this.occurrenceRepo.find({
      where: { companyId, id: In(occurrenceIds) },
    });
    const occurrenceById = new Map(occurrences.map((o) => [o.id, o]));

    type StopAgg = {
      dispatchId: string;
      total: string;
      visited: string;
      skipped: string;
      pending: string;
    };
    const stopAggRows: StopAgg[] = await this.stopRepo
      .createQueryBuilder('s')
      .select('s.dispatchId', 'dispatchId')
      .addSelect('COUNT(*)', 'total')
      .addSelect(`SUM(CASE WHEN s.stopStatus = 'visited' THEN 1 ELSE 0 END)`, 'visited')
      .addSelect(`SUM(CASE WHEN s.stopStatus = 'skipped' THEN 1 ELSE 0 END)`, 'skipped')
      .addSelect(`SUM(CASE WHEN s.stopStatus = 'pending' THEN 1 ELSE 0 END)`, 'pending')
      .where('s.companyId = :companyId', { companyId })
      .andWhere('s.dispatchId IN (:...dispatchIds)', { dispatchIds })
      .groupBy('s.dispatchId')
      .getRawMany();

    const stopAggByDispatch = new Map(
      stopAggRows.map((row) => [
        row.dispatchId,
        {
          total: Number(row.total) || 0,
          visited: Number(row.visited) || 0,
          skipped: Number(row.skipped) || 0,
          pending: Number(row.pending) || 0,
        },
      ]),
    );

    type OrderAgg = { occurrenceId: string; count: string };
    const orderAggRows: OrderAgg[] = await this.deliveryOrderRepo
      .createQueryBuilder('ord')
      .select('ord.deliveryOccurrenceId', 'occurrenceId')
      .addSelect('COUNT(*)', 'count')
      .where('ord.companyId = :companyId', { companyId })
      .andWhere('ord.deliveryOccurrenceId IN (:...occurrenceIds)', { occurrenceIds })
      .andWhere(`ord.deliveryStatus <> 'CANCELLED'`)
      .groupBy('ord.deliveryOccurrenceId')
      .getRawMany();

    const orderCountByOccurrence = new Map(
      orderAggRows.map((row) => [row.occurrenceId, Number(row.count) || 0]),
    );

    type ItemAgg = { dispatch_id: string; item_count: string };
    const itemAggRows: ItemAgg[] = await this.stopRepo.manager.query(
      `
      SELECT d.id AS dispatch_id,
             COALESCE(SUM(
               CASE
                 WHEN tl."productId" IS NOT NULL
                   AND COALESCE(tl.notes, '') <> 'pos_delivery_shipping'
                 THEN tl.quantity::numeric
                 ELSE 0
               END
             ), 0)::int AS item_count
      FROM delivery_dispatches d
      LEFT JOIN delivery_stops s
        ON s.dispatch_id = d.id AND s.company_id = d.company_id
      LEFT JOIN delivery_orders ord ON ord.id = s.delivery_order_id
      LEFT JOIN transaction_lines tl ON tl."transactionId" = ord.transaction_id
      WHERE d.company_id = $1 AND d.id = ANY($2::uuid[])
      GROUP BY d.id
      `,
      [companyId, dispatchIds],
    );

    const itemCountByDispatch = new Map(
      itemAggRows.map((row) => [row.dispatch_id, Number(row.item_count) || 0]),
    );

    const dispatchIdsWithoutStops = dispatchIds.filter(
      (id) => (stopAggByDispatch.get(id)?.total ?? 0) === 0,
    );
    if (dispatchIdsWithoutStops.length > 0) {
      const fallbackItemRows: ItemAgg[] = await this.stopRepo.manager.query(
        `
        SELECT d.id AS dispatch_id,
               COALESCE(SUM(
                 CASE
                   WHEN tl."productId" IS NOT NULL
                     AND COALESCE(tl.notes, '') <> 'pos_delivery_shipping'
                   THEN tl.quantity::numeric
                   ELSE 0
                 END
               ), 0)::int AS item_count
        FROM delivery_dispatches d
        JOIN delivery_orders ord
          ON ord.delivery_occurrence_id = d.occurrence_id
         AND ord.company_id = d.company_id
         AND ord.delivery_status <> 'CANCELLED'
        LEFT JOIN transaction_lines tl ON tl."transactionId" = ord.transaction_id
        WHERE d.company_id = $1 AND d.id = ANY($2::uuid[])
        GROUP BY d.id
        `,
        [companyId, dispatchIdsWithoutStops],
      );
      for (const row of fallbackItemRows) {
        itemCountByDispatch.set(row.dispatch_id, Number(row.item_count) || 0);
      }
    }

    return dispatches.map((dispatch) => {
      const occurrence = occurrenceById.get(dispatch.occurrenceId);
      const stopAgg = stopAggByDispatch.get(dispatch.id);
      const stopCountFromRoute = stopAgg?.total ?? 0;
      const orderCount = orderCountByOccurrence.get(dispatch.occurrenceId) ?? 0;
      const stopCount = stopCountFromRoute > 0 ? stopCountFromRoute : orderCount;
      const completedStopCount = (stopAgg?.visited ?? 0) + (stopAgg?.skipped ?? 0);
      const pendingStopCount =
        stopCountFromRoute > 0
          ? (stopAgg?.pending ?? 0)
          : Math.max(stopCount - completedStopCount, 0);

      return {
        id: dispatch.id,
        label: dispatch.label,
        status: dispatch.status,
        occurrenceId: dispatch.occurrenceId,
        occurrenceName: occurrence?.name ?? dispatch.label ?? 'Reparto',
        startedAt: dispatch.startedAt?.toISOString() ?? null,
        departureTime: occurrence?.departureTime ?? '00:00:00',
        orderCutoffTime: occurrence?.orderCutoffTime ?? '00:00:00',
        stopCount,
        completedStopCount,
        pendingStopCount,
        itemCount: itemCountByDispatch.get(dispatch.id) ?? 0,
        totalDistanceM: dispatch.totalDistanceM,
        totalDurationS: dispatch.totalDurationS,
      };
    });
  }

  async saveOptimizedStops(
    companyId: string,
    dispatchId: string,
    stops: Array<{
      deliveryOrderId: string;
      transactionId: string;
      latitude: number;
      longitude: number;
      sequence: number;
    }>,
    route: {
      totalDistanceM: number;
      totalDurationS: number;
      routeGeometry: Record<string, unknown>;
    },
  ) {
    await this.stopRepo.delete({ companyId, dispatchId });
    if (stops.length > 0) {
      await this.stopRepo.save(
        stops.map((s) =>
          this.stopRepo.create({
            companyId,
            dispatchId,
            deliveryOrderId: s.deliveryOrderId,
            transactionId: s.transactionId,
            sequence: s.sequence,
            latitude: s.latitude,
            longitude: s.longitude,
            stopStatus: 'pending',
          }),
        ),
      );
    }
    const dispatch = await this.dispatchRepo.findOneOrFail({ where: { companyId, id: dispatchId } });
    dispatch.status = 'route_ready';
    dispatch.totalDistanceM = route.totalDistanceM;
    dispatch.totalDurationS = route.totalDurationS;
    dispatch.routeGeometry = route.routeGeometry;
    dispatch.routeOptimizedAt = new Date();
    await this.dispatchRepo.save(dispatch);

    const occurrence = await this.occurrenceRepo.findOneOrFail({
      where: { companyId, id: dispatch.occurrenceId },
    });
    occurrence.routeStatus = 'route_ready';
    occurrence.totalDistanceM = route.totalDistanceM;
    occurrence.totalDurationS = route.totalDurationS;
    occurrence.routeGeometry = route.routeGeometry;
    occurrence.routeOptimizedAt = new Date();
    await this.occurrenceRepo.save(occurrence);
    return dispatch;
  }

  async start(companyId: string, dispatchId: string) {
    const dispatch = await this.dispatchRepo.findOne({ where: { companyId, id: dispatchId } });
    if (!dispatch) throw new BadRequestException('Despacho no encontrado');
    dispatch.status = 'out';
    dispatch.startedAt = new Date();
    await this.dispatchRepo.save(dispatch);

    if (dispatch.occurrenceId) {
      const occurrence = await this.occurrenceRepo.findOne({
        where: { companyId, id: dispatch.occurrenceId },
      });
      if (occurrence && occurrence.routeStatus !== 'out') {
        occurrence.routeStatus = 'out';
        occurrence.routeStartedAt = occurrence.routeStartedAt ?? new Date();
        await this.occurrenceRepo.save(occurrence);
      }
    }

    const linkedOrders = await this.deliveryOrderRepo.find({
      where: { companyId, deliveryDispatchId: dispatchId },
    });
    const stops = await this.stopRepo.find({ where: { companyId, dispatchId } });
    const orderIds = new Set<string>([
      ...linkedOrders.map((o) => o.id),
      ...stops.map((s) => s.deliveryOrderId),
    ]);
    for (const orderId of orderIds) {
      const order =
        linkedOrders.find((o) => o.id === orderId) ??
        (await this.deliveryOrderRepo.findOne({ where: { companyId, id: orderId } }));
      if (!order) continue;
      if (order.deliveryDispatchId !== dispatchId) {
        order.deliveryDispatchId = dispatchId;
        await this.deliveryOrderRepo.save(order);
      }
      if (order.deliveryStatus === 'READY_FOR_DISPATCH') {
        await this.deliveryOrderService.updateStatus(companyId, orderId, 'IN_TRANSIT');
      }
    }
    return dispatch;
  }

  async complete(companyId: string, dispatchId: string) {
    const dispatch = await this.dispatchRepo.findOne({ where: { companyId, id: dispatchId } });
    if (!dispatch) throw new BadRequestException('Despacho no encontrado');
    dispatch.status = 'completed';
    dispatch.completedAt = new Date();
    return this.dispatchRepo.save(dispatch);
  }

  /** @deprecated Prefer DeliveryOperationsBoardService.getBoard */
  async getOperationsBoard(companyId: string) {
    const orders = await this.deliveryOrderRepo.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
      take: 200,
    });
    const byStatus: Record<string, typeof orders> = {};
    for (const o of orders) {
      byStatus[o.deliveryStatus] = byStatus[o.deliveryStatus] ?? [];
      byStatus[o.deliveryStatus].push(o);
    }
    return byStatus;
  }

  private async requireMutableOccurrence(companyId: string, occurrenceId: string) {
    const occurrence = await this.occurrenceRepo.findOne({
      where: { companyId, id: occurrenceId },
    });
    if (!occurrence) throw new NotFoundException('Reparto no encontrado');
    if (occurrence.isCancelled) {
      throw new BadRequestException('El reparto está cancelado');
    }
    return occurrence;
  }
}
