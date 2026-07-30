import { Injectable, BadRequestException, NotFoundException, Optional, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Transaction,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import {
  ESHOP_ORDER_STATUS_TRANSITIONS,
  ESHOP_ORDER_TERMINAL_STATUSES,
  type EShopFulfillmentStatus,
  type TransactionEShopOrderMetadata,
} from '@modules/transactions/domain/transaction-eshop-order.metadata';
import { EShopOrderNotificationService } from './eshop-order-notification.service';
import { KaiMailClient } from '@shared/mail/kai-mail.client';
import { EshopBackorderSyncService } from '@modules/transactions/application/eshop-backorder-sync.service';

const ESHOP_ORDER_TYPES = [
  TransactionType.CUSTOMER_ORDER,
  TransactionType.BACKORDER,
  TransactionType.SALE,
] as const;

@Injectable()
export class EShopOrderStatusService {
  private readonly logger = new Logger(EShopOrderStatusService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    private readonly eshopBackorderSync: EshopBackorderSyncService,
    @Optional() private readonly orderNotifications?: EShopOrderNotificationService,
    @Optional() private readonly kaiMail?: KaiMailClient,
  ) {}

  async listOrders(
    companyId: string,
    opts: { page?: number; limit?: number; status?: string; search?: string },
  ) {
    const page = Math.max(1, Number(opts.page) || 1);
    const limit = Math.min(Math.max(1, Number(opts.limit) || 25), 100);

    const qb = this.txRepo
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.customer', 'customer')
      .leftJoinAndSelect('customer.person', 'customerPerson')
      .where('tx.companyId = :companyId', { companyId })
      .andWhere(
        `(
          (tx.metadata->>'source' = 'e-shop' AND tx.transactionType IN (:...orderTypes))
          OR (tx.metadata->>'source' = 'e-shop' AND tx.transactionType = :saleType)
        )`,
        {
          orderTypes: [TransactionType.CUSTOMER_ORDER, TransactionType.BACKORDER],
          saleType: TransactionType.SALE,
        },
      );

    if (opts.status?.trim()) {
      qb.andWhere(`tx.metadata->'eShopOrder'->>'fulfillmentStatus' = :status`, {
        status: opts.status.trim(),
      });
    }

    if (opts.search?.trim()) {
      qb.andWhere(
        `(tx.documentNumber ILIKE :q OR tx.metadata->'eShopOrder'->'customerSnapshot'->>'name' ILIKE :q OR tx.metadata->'eShopOrder'->'customerSnapshot'->>'email' ILIKE :q)`,
        { q: `%${opts.search.trim()}%` },
      );
    }

    const total = await qb.getCount();
    const rows = await qb
      .orderBy('tx.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data: rows.map((tx) => this.toListRow(tx)),
      total,
      page,
      limit,
    };
  }

  async getOrder(companyId: string, id: string) {
    const tx = await this.txRepo.findOne({
      where: { id, companyId },
      relations: ['customer', 'customer.person', 'lines'],
    });
    if (!tx || !this.isEshopOrder(tx)) {
      throw new NotFoundException('Pedido eShop no encontrado');
    }
    return this.toDetail(tx);
  }

  async listOrdersForCustomer(
    companyId: string,
    customerId: string,
    opts: { page?: number; limit?: number },
  ) {
    const page = Math.max(1, Number(opts.page) || 1);
    const limit = Math.min(Math.max(1, Number(opts.limit) || 25), 100);

    const qb = this.txRepo
      .createQueryBuilder('tx')
      .where('tx.companyId = :companyId', { companyId })
      .andWhere('tx.customerId = :customerId', { customerId })
      .andWhere(`tx.metadata->>'source' = 'e-shop'`);

    const total = await qb.getCount();
    const rows = await qb
      .orderBy('tx.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data: rows.map((tx) => this.toListRow(tx)),
      total,
      page,
      limit,
    };
  }

  async getOrderForCustomer(companyId: string, customerId: string, id: string) {
    const tx = await this.txRepo.findOne({
      where: { id, companyId, customerId },
      relations: ['lines'],
    });
    if (!tx || !this.isEshopOrder(tx)) {
      throw new NotFoundException('Pedido no encontrado');
    }
    return this.toDetail(tx);
  }

  async updateStatus(
    companyId: string,
    id: string,
    status: EShopFulfillmentStatus,
    opts?: { byUserId?: string; note?: string },
  ) {
    const tx = await this.txRepo.findOne({ where: { id, companyId } });
    if (!tx || !this.isEshopOrder(tx)) {
      throw new NotFoundException('Pedido eShop no encontrado');
    }

    const meta = { ...(tx.metadata ?? {}) } as Record<string, unknown>;
    const eShopOrder = {
      ...((meta.eShopOrder ?? {}) as TransactionEShopOrderMetadata),
    };
    const current = eShopOrder.fulfillmentStatus ?? 'SUBMITTED';
    const allowed = ESHOP_ORDER_STATUS_TRANSITIONS[current] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `No se puede cambiar de ${current} a ${status}`,
      );
    }

    const now = new Date().toISOString();
    eShopOrder.fulfillmentStatus = status;
    eShopOrder.statusHistory = [
      ...(eShopOrder.statusHistory ?? []),
      {
        status,
        at: now,
        byUserId: opts?.byUserId ?? null,
        note: opts?.note?.trim() || null,
      },
    ];
    meta.eShopOrder = eShopOrder;
    tx.metadata = meta;
    await this.txRepo.save(tx);

    if (status === 'CANCELLED') {
      await this.eshopBackorderSync.syncBackorderOnEshopFulfillmentCancelled(
        tx.id,
        opts?.note,
      );
    }

    try {
      await this.orderNotifications?.publishStatusChanged(companyId, tx, status);
    } catch (err) {
      this.logger.warn('No se pudo publicar notificación de cambio de estado', err);
    }

    const email = eShopOrder.customerSnapshot?.email;
    const template = this.templateForStatus(status);
    if (email && template) {
      try {
        await this.kaiMail?.sendOrderTemplate({
          template,
          to: email,
          idempotencyKey: `order:${tx.id}:${status}`,
          variables: {
            customerName: eShopOrder.customerSnapshot?.name ?? 'Cliente',
            orderNumber: tx.documentNumber ?? tx.id,
            fulfillmentMethod: eShopOrder.fulfillmentMethodSnapshot?.name ?? '',
            statusMessage: status,
          },
        });
      } catch (err) {
        this.logger.warn('No se pudo encolar email de cambio de estado', err);
      }
    }

    return this.getOrder(companyId, id);
  }

  private templateForStatus(status: EShopFulfillmentStatus): string | null {
    const map: Partial<Record<EShopFulfillmentStatus, string>> = {
      CONFIRMED: 'order.confirmed',
      PREPARING: 'order.preparing',
      READY_FOR_PICKUP: 'order.ready_pickup',
      SHIPPED: 'order.shipped',
      DELIVERED: 'order.completed',
      CANCELLED: 'order.cancelled',
    };
    return map[status] ?? null;
  }

  private isEshopOrder(tx: Transaction): boolean {
    const meta = (tx.metadata ?? {}) as Record<string, unknown>;
    return meta.source === 'e-shop';
  }

  private toListRow(tx: Transaction) {
    const meta = (tx.metadata ?? {}) as Record<string, unknown>;
    const eShopOrder = (meta.eShopOrder ?? {}) as TransactionEShopOrderMetadata;
    const bo = (meta.backorder ?? {}) as Record<string, unknown>;
    const isLegacy =
      tx.transactionType === TransactionType.SALE ||
      eShopOrder.isLegacy === true;
    return {
      id: tx.id,
      documentNumber: tx.documentNumber,
      transactionType: tx.transactionType,
      total: Number(tx.total),
      createdAt: tx.createdAt,
      fulfillmentStatus: eShopOrder.fulfillmentStatus ?? (isLegacy ? 'DELIVERED' : 'SUBMITTED'),
      fulfillmentMethodName: eShopOrder.fulfillmentMethodSnapshot?.name ?? null,
      customerName:
        eShopOrder.customerSnapshot?.name ??
        (meta.customerName as string | undefined) ??
        null,
      customerEmail:
        eShopOrder.customerSnapshot?.email ??
        (meta.customerEmail as string | undefined) ??
        null,
      isLegacy,
      isTerminal: ESHOP_ORDER_TERMINAL_STATUSES.includes(
        eShopOrder.fulfillmentStatus ?? 'SUBMITTED',
      ),
      orderSource: String(meta.source ?? 'e-shop'),
      backorderReservationStatus:
        typeof bo.reservationStatus === 'string' ? bo.reservationStatus : null,
      backorderDepositAmount: Number(bo.depositAmount ?? tx.amountPaid) || 0,
    };
  }

  private toDetail(tx: Transaction) {
    const list = this.toListRow(tx);
    const meta = (tx.metadata ?? {}) as Record<string, unknown>;
    const eShopOrder = (meta.eShopOrder ?? {}) as TransactionEShopOrderMetadata;
    return {
      ...list,
      status: tx.status,
      notes: tx.notes,
      shippingCost: eShopOrder.shippingCost ?? 0,
      shippingAddress: eShopOrder.shippingAddress ?? null,
      stockSnapshot: eShopOrder.stockSnapshot ?? [],
      statusHistory: eShopOrder.statusHistory ?? [],
      lines: (tx.lines ?? []).map((l) => ({
        id: l.id,
        productName: l.productName,
        productSku: l.productSku,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        total: Number(l.total),
      })),
      customerId: tx.customerId,
    };
  }
}
