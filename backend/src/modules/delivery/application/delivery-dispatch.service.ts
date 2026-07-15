import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EShopDeliveryDispatch } from '../domain/e-shop-delivery-dispatch.entity';
import { EShopDeliveryStop } from '../domain/e-shop-delivery-stop.entity';
import { EShopDeliveryOrder } from '../domain/e-shop-delivery-order.entity';
import { EShopDeliveryOccurrence } from '../domain/e-shop-delivery-occurrence.entity';
import { DeliveryOrderService } from './delivery-order.service';
import { ListDeliveryCouriersService } from './list-delivery-couriers.service';
import type { DeliveryOrderStatus } from '../domain/delivery.types';

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

    const orders = await this.deliveryOrderRepo.find({
      where: { companyId, deliveryDispatchId: dispatchId },
    });
    for (const o of orders) {
      o.deliveryStatus = 'IN_TRANSIT';
      await this.deliveryOrderRepo.save(o);
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
