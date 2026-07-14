import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import {
  PaymentStatus,
  TransactionStatus,
} from '@modules/transactions/domain/transaction.entity';
import type { PaymentGatewayIntent } from '../domain/payment-gateway-intent.entity';
import { EShopCart } from '@modules/e-shop/domain/e-shop-cart.entity';
import { EShopCartItem } from '@modules/e-shop/domain/e-shop-cart-item.entity';

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

    tx.paymentStatus = PaymentStatus.PAID;
    if (tx.status === TransactionStatus.PENDING) {
      tx.status = TransactionStatus.CONFIRMED;
    }
    const meta = { ...(tx.metadata ?? {}) } as Record<string, unknown>;
    const eShopOrder = {
      ...((meta.eShopOrder ?? {}) as Record<string, unknown>),
      fulfillmentStatus: 'CONFIRMED',
      paymentExpectation: 'ONLINE_REQUIRED',
    };
    meta.eShopOrder = eShopOrder;
    tx.metadata = meta;
    await this.transactionRepo.save(tx);

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
  }
}
