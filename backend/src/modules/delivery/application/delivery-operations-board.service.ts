import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { User } from '@modules/users/domain/user.entity';
import { EShopDeliveryOccurrence } from '../domain/e-shop-delivery-occurrence.entity';
import { EShopDeliveryOccurrenceZone } from '../domain/e-shop-delivery-occurrence-zone.entity';
import { EShopDeliveryOrder } from '../domain/e-shop-delivery-order.entity';
import { EShopDeliveryStop } from '../domain/e-shop-delivery-stop.entity';
import { EShopDeliveryZone } from '../domain/e-shop-delivery-zone.entity';
import { EShopDeliveryDispatch } from '../domain/e-shop-delivery-dispatch.entity';
import {
  DELIVERY_OPERATIONS_STAGES,
  DELIVERY_ORDER_STATUS_TRANSITIONS,
  type DeliveryOperationsBoardDto,
  type DeliveryOperationsBoardOccurrenceDto,
  type DeliveryOperationsOrderDto,
  type DeliveryOperationsOrderLineDto,
  type DeliveryOrderCounts,
  type DeliveryOrderStatus,
} from '../domain/delivery.types';
import { DeliveryOrderLinePickingService } from './delivery-order-line-picking.service';
import { ListDeliveryCouriersService } from './list-delivery-couriers.service';

@Injectable()
export class DeliveryOperationsBoardService {
  constructor(
    @InjectRepository(EShopDeliveryOccurrence)
    private readonly occurrenceRepo: Repository<EShopDeliveryOccurrence>,
    @InjectRepository(EShopDeliveryOccurrenceZone)
    private readonly occurrenceZoneRepo: Repository<EShopDeliveryOccurrenceZone>,
    @InjectRepository(EShopDeliveryOrder)
    private readonly orderRepo: Repository<EShopDeliveryOrder>,
    @InjectRepository(EShopDeliveryZone)
    private readonly zoneRepo: Repository<EShopDeliveryZone>,
    @InjectRepository(EShopDeliveryStop)
    private readonly stopRepo: Repository<EShopDeliveryStop>,
    @InjectRepository(EShopDeliveryDispatch)
    private readonly dispatchRepo: Repository<EShopDeliveryDispatch>,
    @InjectRepository(TransactionLine)
    private readonly lineRepo: Repository<TransactionLine>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly picking: DeliveryOrderLinePickingService,
    private readonly couriers: ListDeliveryCouriersService,
  ) {}

  async getBoard(
    companyId: string,
    input: { date: string; occurrenceId?: string | null; search?: string | null },
  ): Promise<DeliveryOperationsBoardDto> {
    const date = input.date;
    const dayOccurrences = await this.occurrenceRepo.find({
      where: { companyId, occurrenceDate: date },
      order: { departureTime: 'ASC' },
    });

    let selected: EShopDeliveryOccurrence | null = null;
    if (input.occurrenceId) {
      selected =
        dayOccurrences.find((o) => o.id === input.occurrenceId) ??
        (await this.occurrenceRepo.findOne({
          where: { companyId, id: input.occurrenceId },
        }));
      if (!selected) {
        throw new NotFoundException('Reparto no encontrado para operación');
      }
      if (selected.occurrenceDate !== date) {
        throw new NotFoundException('El reparto no corresponde a la fecha indicada');
      }
    } else {
      selected = dayOccurrences[0] ?? null;
    }

    if (!selected) {
      return {
        date,
        occurrence: null,
        ordersByStatus: {},
        totals: {},
        submittedCount: 0,
      };
    }

    let orders = await this.orderRepo.find({
      where: { companyId, deliveryOccurrenceId: selected.id },
      order: { createdAt: 'ASC' },
    });

    const search = input.search?.trim().toLowerCase() ?? '';
    if (search) {
      orders = orders.filter((o) => this.matchesSearch(o, search));
    }

    const orderIds = orders.map((o) => o.id);
    const transactionIds = [...new Set(orders.map((o) => o.transactionId))];
    const lines =
      transactionIds.length > 0
        ? await this.lineRepo.find({
            where: { companyId, transactionId: In(transactionIds) },
            order: { lineNumber: 'ASC' },
          })
        : [];
    const picks = await this.picking.getPicksForOrders(companyId, orderIds);
    const pickByOrderLine = new Map(
      picks.map((p) => [`${p.deliveryOrderId}:${p.transactionLineId}`, p]),
    );
    const linesByTx = new Map<string, TransactionLine[]>();
    for (const line of lines) {
      if (!line.transactionId) continue;
      const list = linesByTx.get(line.transactionId) ?? [];
      list.push(line);
      linesByTx.set(line.transactionId, list);
    }

    const mappedOrders = orders.map((order) =>
      this.toOrderDto(order, linesByTx.get(order.transactionId) ?? [], pickByOrderLine),
    );

    const ordersByStatus: DeliveryOperationsBoardDto['ordersByStatus'] = {};
    const totals: DeliveryOrderCounts = {};
    let submittedCount = 0;

    for (const order of mappedOrders) {
      if (order.deliveryStatus === 'SUBMITTED') {
        submittedCount += 1;
        continue;
      }
      if (!DELIVERY_OPERATIONS_STAGES.includes(order.deliveryStatus)) {
        continue;
      }
      const list = ordersByStatus[order.deliveryStatus] ?? [];
      list.push(order);
      ordersByStatus[order.deliveryStatus] = list;
      totals[order.deliveryStatus] = (totals[order.deliveryStatus] ?? 0) + 1;
    }

    // Include submitted in totals for readiness helpers (blocking).
    totals.SUBMITTED = submittedCount;

    const occurrenceDto = await this.toOccurrenceDto(companyId, selected, totals);

    return {
      date,
      occurrence: occurrenceDto,
      ordersByStatus,
      totals,
      submittedCount,
    };
  }

  private matchesSearch(order: EShopDeliveryOrder, search: string): boolean {
    const haystack = [
      order.customerName,
      order.customerPhone,
      order.commune,
      order.addressLine1,
      order.transactionId,
      order.id,
      order.notes,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(search);
  }

  private toOrderDto(
    order: EShopDeliveryOrder,
    lines: TransactionLine[],
    pickByOrderLine: Map<string, { isPicked: boolean }>,
  ): DeliveryOperationsOrderDto {
    const mappedLines: DeliveryOperationsOrderLineDto[] = lines.map((line) => {
      const pick = pickByOrderLine.get(`${order.id}:${line.id}`);
      return {
        id: line.id,
        productName: line.productName,
        variantLabel: line.variantName ?? '',
        sku: line.productSku ?? null,
        quantity: Number(line.quantity) || 0,
        unitPrice: Number(line.unitPrice) || 0,
        lineTotal: Number(line.total) || 0,
        isPicked: Boolean(pick?.isPicked),
      };
    });
    const pickedCount = mappedLines.filter((l) => l.isPicked).length;
    const itemsSummary = mappedLines
      .slice(0, 3)
      .map((l) => `${l.quantity}× ${l.productName}`)
      .join(', ');

    return {
      id: order.id,
      transactionId: order.transactionId,
      orderNumber: order.transactionId.slice(0, 8).toUpperCase(),
      deliveryStatus: order.deliveryStatus,
      sourceChannel: order.sourceChannel === 'POS' ? 'POS' : 'ESHOP',
      customerLabel: order.customerName?.trim() || 'Cliente',
      customerPhone: order.customerPhone,
      addressShort: [order.addressLine1, order.commune].filter(Boolean).join(', '),
      commune: order.commune,
      shippingFee: Number(order.shippingFee) || 0,
      itemsSummary: itemsSummary || 'Sin ítems',
      lineCount: mappedLines.length,
      pickedCount,
      lines: mappedLines,
      allowedNextStatuses: DELIVERY_ORDER_STATUS_TRANSITIONS[order.deliveryStatus] ?? [],
      createdAt: order.createdAt.toISOString(),
    };
  }

  private async toOccurrenceDto(
    companyId: string,
    occurrence: EShopDeliveryOccurrence,
    orderCounts: DeliveryOrderCounts,
  ): Promise<DeliveryOperationsBoardOccurrenceDto> {
    const links = await this.occurrenceZoneRepo.find({
      where: { companyId, occurrenceId: occurrence.id },
    });
    const zoneIds = links.map((l) => l.zoneId);
    const zones =
      zoneIds.length > 0
        ? await this.zoneRepo.find({ where: { companyId, id: In(zoneIds) } })
        : [];

    let driverLabel: string | null = null;
    if (occurrence.driverUserId) {
      const driver = await this.userRepo.findOne({
        where: { id: occurrence.driverUserId, companyId },
        relations: { person: true },
      });
      driverLabel = this.couriers.formatLabel(driver);
    }

    const dispatch = await this.dispatchRepo.findOne({
      where: { companyId, occurrenceId: occurrence.id },
      order: { createdAt: 'ASC' },
    });
    const stopCount = dispatch
      ? await this.stopRepo.count({ where: { companyId, dispatchId: dispatch.id } })
      : 0;

    return {
      id: occurrence.id,
      name: occurrence.name,
      occurrenceDate: occurrence.occurrenceDate,
      departureTime: occurrence.departureTime.slice(0, 5),
      orderCutoffTime: occurrence.orderCutoffTime.slice(0, 5),
      maxOrders: occurrence.maxOrders,
      driverUserId: occurrence.driverUserId,
      driverLabel,
      isCancelled: occurrence.isCancelled,
      routeStatus: occurrence.routeStatus,
      zones: zones.map((z) => ({ id: z.id, name: z.name })),
      orderCounts,
      totalDistanceM: occurrence.totalDistanceM,
      totalDurationS: occurrence.totalDurationS,
      stopCount,
      routeOptimizedAt: occurrence.routeOptimizedAt?.toISOString() ?? null,
      routeStartedAt: occurrence.routeStartedAt?.toISOString() ?? null,
      routeCompletedAt: occurrence.routeCompletedAt?.toISOString() ?? null,
    };
  }
}
