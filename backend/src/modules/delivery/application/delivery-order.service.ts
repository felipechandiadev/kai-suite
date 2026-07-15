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
    /** Default SUBMITTED (eShop). POS cobrado debe usar CONFIRMED. */
    deliveryStatus?: DeliveryOrderStatus;
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
        deliveryStatus: input.deliveryStatus ?? 'SUBMITTED',
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
      // Venta ya cobrada en caja: entra directo al tablero operativo.
      deliveryStatus: 'CONFIRMED',
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

  /**
   * Cierre de parada en ruta: si el pedido aún está listo para despacho
   * (ruta no iniciada o enlace incompleto), avanza a IN_TRANSIT antes del resultado.
   */
  async completeCourierStop(
    companyId: string,
    deliveryOrderId: string,
    outcome: 'DELIVERED' | 'ISSUE',
  ) {
    const row = await this.orderRepo.findOne({ where: { companyId, id: deliveryOrderId } });
    if (!row) throw new BadRequestException('Pedido delivery no encontrado');
    if (row.deliveryStatus === outcome) return row;
    if (row.deliveryStatus === 'READY_FOR_DISPATCH') {
      await this.updateStatus(companyId, deliveryOrderId, 'IN_TRANSIT');
    }
    return this.updateStatus(companyId, deliveryOrderId, outcome);
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

  /**
   * Tras pago online eShop: SUBMITTED → CONFIRMED (tablero operativo / reparto).
   */
  async confirmAfterOnlinePayment(companyId: string, transactionId: string) {
    const row = await this.findByTransaction(companyId, transactionId);
    if (!row) return null;
    if (row.deliveryStatus !== 'SUBMITTED') return row;
    return this.updateStatus(companyId, row.id, 'CONFIRMED');
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
