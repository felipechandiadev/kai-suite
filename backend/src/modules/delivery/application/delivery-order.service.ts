import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { EShopDeliveryOrder } from '../domain/e-shop-delivery-order.entity';
import {
  DELIVERY_ORDER_STATUS_TRANSITIONS,
  type DeliveryOrderStatus,
} from '../domain/delivery.types';

@Injectable()
export class DeliveryOrderService {
  constructor(
    @InjectRepository(EShopDeliveryOrder)
    private readonly orderRepo: Repository<EShopDeliveryOrder>,
    private readonly dataSource: DataSource,
  ) {}

  async createFromCheckout(input: {
    companyId: string;
    transactionId: string;
    fulfillmentType: 'PICKUP' | 'LOCAL_DELIVERY';
    sourceChannel?: 'POS' | 'ESHOP';
    deliveryZoneId?: string | null;
    deliveryOccurrenceId?: string | null;
    addressLine1?: string | null;
    commune?: string | null;
    region?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    shippingFee?: number;
    customerName?: string | null;
    customerPhone?: string | null;
    notes?: string | null;
  }) {
    const row = await this.orderRepo.save(
      this.orderRepo.create({
        companyId: input.companyId,
        transactionId: input.transactionId,
        fulfillmentType: input.fulfillmentType,
        sourceChannel: input.sourceChannel ?? 'ESHOP',
        deliveryZoneId: input.deliveryZoneId ?? null,
        deliveryOccurrenceId: input.deliveryOccurrenceId ?? null,
        addressLine1: input.addressLine1 ?? null,
        commune: input.commune ?? null,
        region: input.region ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        shippingFee: input.shippingFee ?? 0,
        customerName: input.customerName ?? null,
        customerPhone: input.customerPhone ?? null,
        notes: input.notes ?? null,
        deliveryStatus: 'SUBMITTED',
      }),
    );

    if (input.latitude != null && input.longitude != null) {
      await this.dataSource.query(
        `UPDATE delivery_orders SET delivery_point = ST_SetSRID(ST_MakePoint($2, $3), 4326) WHERE id = $1`,
        [row.id, input.longitude, input.latitude],
      );
    }
    return row;
  }

  /** Pedido de reparto local creado desde una venta POS (mismo dominio que e-shop). */
  async createFromPosSale(input: {
    companyId: string;
    transactionId: string;
    deliveryZoneId: string;
    deliveryOccurrenceId: string;
    addressLine1: string;
    commune: string;
    region?: string | null;
    latitude: number;
    longitude: number;
    shippingFee: number;
    customerName?: string | null;
    customerPhone?: string | null;
    notes?: string | null;
  }) {
    return this.createFromCheckout({
      ...input,
      fulfillmentType: 'LOCAL_DELIVERY',
      sourceChannel: 'POS',
    });
  }

  async updateStatus(companyId: string, deliveryOrderId: string, status: DeliveryOrderStatus) {
    const row = await this.orderRepo.findOne({ where: { companyId, id: deliveryOrderId } });
    if (!row) throw new BadRequestException('Pedido delivery no encontrado');
    const allowed = DELIVERY_ORDER_STATUS_TRANSITIONS[row.deliveryStatus] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Transición inválida: ${row.deliveryStatus} → ${status}`,
      );
    }
    row.deliveryStatus = status;
    return this.orderRepo.save(row);
  }

  async listByStatus(companyId: string, statuses: DeliveryOrderStatus[]) {
    return this.orderRepo.find({
      where: { companyId, deliveryStatus: statuses as any },
      order: { createdAt: 'ASC' },
    });
  }

  async findByTransaction(companyId: string, transactionId: string) {
    return this.orderRepo.findOne({ where: { companyId, transactionId } });
  }

  async findByIds(companyId: string, ids: string[]) {
    if (ids.length === 0) return [];
    return this.orderRepo.find({
      where: { companyId, id: In(ids) },
    });
  }

  async assignToDispatch(
    companyId: string,
    deliveryOrderId: string,
    dispatchId: string,
  ) {
    const row = await this.orderRepo.findOne({ where: { companyId, id: deliveryOrderId } });
    if (!row) throw new BadRequestException('Pedido delivery no encontrado');
    row.deliveryDispatchId = dispatchId;
    if (row.deliveryStatus === 'PREPARING' || row.deliveryStatus === 'CONFIRMED') {
      row.deliveryStatus = 'READY_FOR_DISPATCH';
    }
    return this.orderRepo.save(row);
  }
}
