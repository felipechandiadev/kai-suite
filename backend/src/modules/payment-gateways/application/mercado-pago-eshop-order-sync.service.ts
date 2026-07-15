import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import {
  PaymentStatus,
  TransactionStatus,
} from '@modules/transactions/domain/transaction.entity';
import type { TransactionEShopOrderMetadata } from '@modules/transactions/domain/transaction-eshop-order.metadata';
import type { PaymentGatewayIntent } from '../domain/payment-gateway-intent.entity';
import { EShopCart } from '@modules/e-shop/domain/e-shop-cart.entity';
import { EShopCartItem } from '@modules/e-shop/domain/e-shop-cart-item.entity';
import { EShopOrderNotificationService } from '@modules/e-shop/application/eshop-order-notification.service';
import { KaiMailClient } from '@shared/mail/kai-mail.client';
import { CompaniesService } from '@modules/companies/application/companies.service';
import { DeliveryOrderService } from '@modules/delivery/application/delivery-order.service';

@Injectable()
export class MercadoPagoEshopOrderSyncService {
  private readonly logger = new Logger(MercadoPagoEshopOrderSyncService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(EShopCart)
    private readonly cartRepo: Repository<EShopCart>,
    @InjectRepository(EShopCartItem)
    private readonly cartItemRepo: Repository<EShopCartItem>,
    private readonly companiesService: CompaniesService,
    @Optional() private readonly deliveryOrders?: DeliveryOrderService,
    @Optional() private readonly orderNotifications?: EShopOrderNotificationService,
    @Optional() private readonly kaiMail?: KaiMailClient,
  ) {}

  async syncOnApprovedPayment(intent: PaymentGatewayIntent): Promise<void> {
    if (intent.channel !== 'ESHOP_CHECKOUT' || intent.status !== 'APPROVED') {
      return;
    }
    if (!intent.transactionId) return;

    const tx = await this.transactionRepo.findOne({
      where: { id: intent.transactionId, companyId: intent.companyId },
    });
    if (!tx) return;
    if (tx.paymentStatus === PaymentStatus.PAID) return;

    const confirmedAt = new Date().toISOString();
    tx.paymentStatus = PaymentStatus.PAID;
    if (tx.status === TransactionStatus.PENDING) {
      tx.status = TransactionStatus.CONFIRMED;
    }
    const meta = { ...(tx.metadata ?? {}) } as Record<string, unknown>;
    const prevEshop = (meta.eShopOrder ?? {}) as TransactionEShopOrderMetadata &
      Record<string, unknown>;
    const history = Array.isArray(prevEshop.statusHistory)
      ? [...prevEshop.statusHistory]
      : [];
    const last = history[history.length - 1]?.status;
    if (last !== 'CONFIRMED') {
      history.push({ status: 'CONFIRMED', at: confirmedAt });
    }
    const eShopOrder = {
      ...prevEshop,
      fulfillmentStatus: 'CONFIRMED',
      paymentExpectation: 'ONLINE_REQUIRED',
      statusHistory: history,
    };
    meta.eShopOrder = eShopOrder;
    tx.metadata = meta;
    await this.transactionRepo.save(tx);

    try {
      await this.deliveryOrders?.confirmAfterOnlinePayment(
        intent.companyId,
        tx.id,
      );
    } catch (err) {
      this.logger.warn(
        'No se pudo confirmar delivery_order tras pago eShop',
        err,
      );
    }

    const cartId = typeof meta.cartId === 'string' ? meta.cartId.trim() : '';
    if (cartId) {
      await this.cartItemRepo.delete({ cartId });
      await this.cartRepo.update(
        { id: cartId, companyId: intent.companyId },
        { status: 'converted' },
      );
      this.logger.log(
        JSON.stringify({
          event: 'eshop_cart_converted',
          cartId,
          transactionId: tx.id,
          companyId: intent.companyId,
        }),
      );
    }

    try {
      await this.orderNotifications?.publishOrderCreated(intent.companyId, tx);
    } catch (err) {
      this.logger.warn('No se pudo publicar notificación de pedido eShop (pago)', err);
    }

    try {
      const snapshot = (eShopOrder as TransactionEShopOrderMetadata).customerSnapshot;
      const to = snapshot?.email?.trim();
      if (to) {
        let storeName = 'Tienda';
        try {
          const company = await this.companiesService.getCompanyById(intent.companyId);
          storeName =
            company.nombreFantasia?.trim() ||
            company.razonSocial?.trim() ||
            'Tienda';
        } catch {
          // keep fallback
        }
        await this.kaiMail?.sendOrderTemplate({
          template: 'order.received',
          to,
          idempotencyKey: `order:${tx.id}:received`,
          variables: {
            customerName: snapshot?.name?.trim() || 'Cliente',
            orderNumber: tx.documentNumber ?? tx.id,
            total: String(Math.round(Number(tx.total) || intent.amount || 0)),
            fulfillmentMethod:
              (eShopOrder as TransactionEShopOrderMetadata).fulfillmentMethodSnapshot
                ?.name ?? '',
            storeName,
          },
        });
      }
    } catch (err) {
      this.logger.warn('No se pudo encolar email de pedido eShop (pago)', err);
    }
  }
}
