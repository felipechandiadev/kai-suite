import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import {
  PaymentStatus,
  TransactionStatus,
} from '@modules/transactions/domain/transaction.entity';
import { CompaniesService } from '@modules/companies/application/companies.service';
import { MercadoPagoClient } from './mercado-pago.client';
import { PaymentGatewayIntentService } from './payment-gateway-intent.service';
import type { MpPaymentResponse } from './mercado-pago.client';

@Injectable()
export class MercadoPagoWebhookService {
  private readonly logger = new Logger(MercadoPagoWebhookService.name);

  constructor(
    private readonly mpClient: MercadoPagoClient,
    private readonly companiesService: CompaniesService,
    private readonly intentService: PaymentGatewayIntentService,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {}

  async handleNotification(body: {
    type?: string;
    action?: string;
    data?: { id?: string };
  }): Promise<void> {
    const paymentId = body?.data?.id != null ? String(body.data.id) : null;
    if (!paymentId) return;

    const intent = await this.intentService.findByMpPaymentId(paymentId);
    if (!intent) {
      this.logger.warn(`Webhook MP sin intent para payment ${paymentId}`);
      return;
    }

    const mpSettings = await this.companiesService.getMercadoPagoSettingsInternal(
      intent.companyId,
    );
    if (!mpSettings.accessToken?.trim()) return;

    const payment = await this.mpClient.getPayment(
      mpSettings.accessToken,
      mpSettings.environment,
      paymentId,
    );

    const updated = await this.intentService.applyMpPayment(intent, payment);
    if (updated.channel === 'ESHOP_CHECKOUT' && updated.transactionId) {
      await this.syncEshopOrderOnPayment(updated, payment);
    }
  }

  private async syncEshopOrderOnPayment(
    intent: { companyId: string; transactionId: string | null },
    payment: MpPaymentResponse,
  ): Promise<void> {
    if (payment.status !== 'approved' || !intent.transactionId) return;
    const tx = await this.transactionRepo.findOne({
      where: { id: intent.transactionId, companyId: intent.companyId },
    });
    if (!tx) return;

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
  }
}
