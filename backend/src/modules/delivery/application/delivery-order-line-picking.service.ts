import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { EShopDeliveryOrder } from '../domain/e-shop-delivery-order.entity';
import { EShopDeliveryOrderLinePick } from '../domain/e-shop-delivery-order-line-pick.entity';
import type { DeliveryOrderStatus } from '../domain/delivery.types';

@Injectable()
export class DeliveryOrderLinePickingService {
  constructor(
    @InjectRepository(EShopDeliveryOrder)
    private readonly orderRepo: Repository<EShopDeliveryOrder>,
    @InjectRepository(EShopDeliveryOrderLinePick)
    private readonly pickRepo: Repository<EShopDeliveryOrderLinePick>,
    @InjectRepository(TransactionLine)
    private readonly lineRepo: Repository<TransactionLine>,
  ) {}

  async toggleLinePicked(
    companyId: string,
    orderId: string,
    lineId: string,
    isPicked: boolean,
    pickedByUserId?: string | null,
  ) {
    const order = await this.requireEditableOrder(companyId, orderId);
    await this.assertLineBelongsToOrder(order, lineId);

    let pick = await this.pickRepo.findOne({
      where: {
        companyId,
        deliveryOrderId: orderId,
        transactionLineId: lineId,
      },
    });

    if (!pick) {
      pick = this.pickRepo.create({
        companyId,
        deliveryOrderId: orderId,
        transactionLineId: lineId,
        isPicked: false,
        pickedAt: null,
        pickedByUserId: null,
      });
    }

    pick.isPicked = isPicked;
    pick.pickedAt = isPicked ? new Date() : null;
    pick.pickedByUserId = isPicked ? pickedByUserId ?? null : null;
    return this.pickRepo.save(pick);
  }

  async pickAll(
    companyId: string,
    orderId: string,
    options?: {
      advanceTo?: DeliveryOrderStatus | null;
      pickedByUserId?: string | null;
    },
  ) {
    const order = await this.requireEditableOrder(companyId, orderId);
    const lines = await this.lineRepo.find({
      where: { companyId, transactionId: order.transactionId },
      order: { lineNumber: 'ASC' },
    });
    if (lines.length === 0) {
      throw new BadRequestException('El pedido no tiene líneas para preparar');
    }

    const existing = await this.pickRepo.find({
      where: { companyId, deliveryOrderId: orderId },
    });
    const byLineId = new Map(existing.map((p) => [p.transactionLineId, p]));
    const now = new Date();
    const toSave = lines.map((line) => {
      const current = byLineId.get(line.id);
      if (current) {
        current.isPicked = true;
        current.pickedAt = now;
        current.pickedByUserId = options?.pickedByUserId ?? null;
        return current;
      }
      return this.pickRepo.create({
        companyId,
        deliveryOrderId: orderId,
        transactionLineId: line.id,
        isPicked: true,
        pickedAt: now,
        pickedByUserId: options?.pickedByUserId ?? null,
      });
    });
    await this.pickRepo.save(toSave);

    if (options?.advanceTo) {
      order.deliveryStatus = options.advanceTo;
      await this.orderRepo.save(order);
    }

    return {
      orderId,
      pickedCount: lines.length,
      lineCount: lines.length,
      deliveryStatus: order.deliveryStatus,
    };
  }

  async getPicksForOrders(companyId: string, orderIds: string[]) {
    if (orderIds.length === 0) return [];
    return this.pickRepo.find({
      where: { companyId, deliveryOrderId: In(orderIds) },
    });
  }

  private async requireEditableOrder(companyId: string, orderId: string) {
    const order = await this.orderRepo.findOne({ where: { companyId, id: orderId } });
    if (!order) throw new NotFoundException('Pedido delivery no encontrado');
    if (
      order.deliveryStatus === 'DELIVERED' ||
      order.deliveryStatus === 'CANCELLED'
    ) {
      throw new BadRequestException(
        `No se puede preparar un pedido en estado "${order.deliveryStatus}"`,
      );
    }
    return order;
  }

  private async assertLineBelongsToOrder(
    order: EShopDeliveryOrder,
    lineId: string,
  ) {
    const line = await this.lineRepo.findOne({
      where: {
        id: lineId,
        companyId: order.companyId,
        transactionId: order.transactionId,
      },
    });
    if (!line) {
      throw new BadRequestException('La línea no pertenece a este pedido');
    }
    return line;
  }
}
