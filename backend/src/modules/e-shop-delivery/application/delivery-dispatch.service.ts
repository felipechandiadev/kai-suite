import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EShopDeliveryDispatch } from '../domain/e-shop-delivery-dispatch.entity';
import { EShopDeliveryStop } from '../domain/e-shop-delivery-stop.entity';
import { EShopDeliveryOrder } from '../domain/e-shop-delivery-order.entity';
import { EShopDeliveryOccurrence } from '../domain/e-shop-delivery-occurrence.entity';
import { DeliveryOrderService } from './delivery-order.service';

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

    const orders = await this.deliveryOrderRepo.find({ where: { companyId, deliveryDispatchId: dispatchId } });
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
}
