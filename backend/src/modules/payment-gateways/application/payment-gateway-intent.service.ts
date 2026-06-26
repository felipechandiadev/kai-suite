import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentGatewayIntent } from '../domain/payment-gateway-intent.entity';
import {
  buildExternalReference,
  mapMpOrderToIntentStatus,
  mapMpPaymentStatus,
  type PaymentGatewayChannel,
  type PaymentGatewayIntentStatus,
} from '../domain/payment-gateway-intent.types';
import type { MpOrderResponse, MpPaymentResponse } from './mercado-pago.client';
import { primaryMpOrderPayment } from './mercado-pago.client';
import { randomUUID } from 'crypto';

@Injectable()
export class PaymentGatewayIntentService {
  constructor(
    @InjectRepository(PaymentGatewayIntent)
    private readonly repo: Repository<PaymentGatewayIntent>,
  ) {}

  async findById(companyId: string, id: string): Promise<PaymentGatewayIntent> {
    const row = await this.repo.findOne({ where: { id, companyId } });
    if (!row) throw new NotFoundException('Intent de pago no encontrado');
    return row;
  }

  async findByMpPaymentId(mpPaymentId: string): Promise<PaymentGatewayIntent | null> {
    return this.repo.findOne({ where: { mpPaymentId } });
  }

  async findByMpOrderId(mpOrderId: string): Promise<PaymentGatewayIntent | null> {
    return this.repo.findOne({ where: { mpOrderId } });
  }

  async findByExternalReference(
    externalReference: string,
  ): Promise<PaymentGatewayIntent | null> {
    return this.repo.findOne({ where: { externalReference } });
  }

  async createIntent(input: {
    companyId: string;
    channel: PaymentGatewayChannel;
    amount: number;
    cashSessionId?: string | null;
    pointOfSaleId?: string | null;
    transactionId?: string | null;
  }): Promise<PaymentGatewayIntent> {
    const amount = Math.round(Number(input.amount) || 0);
    if (amount <= 0) {
      throw new BadRequestException('Monto inválido para intent de pago');
    }
    const id = randomUUID();
    const externalReference = buildExternalReference(
      input.companyId,
      input.channel,
      id,
    );
    const row = this.repo.create({
      id,
      companyId: input.companyId,
      channel: input.channel,
      status: 'CREATED',
      amount,
      currency: 'CLP',
      mpPaymentId: null,
      mpOrderId: null,
      externalReference,
      idempotencyKey: `ks-${id}`,
      cashSessionId: input.cashSessionId ?? null,
      pointOfSaleId: input.pointOfSaleId ?? null,
      transactionId: input.transactionId ?? null,
      metadata: null,
    });
    return this.repo.save(row);
  }

  async saveMpPreferenceId(
    intent: PaymentGatewayIntent,
    preferenceId: string,
  ): Promise<PaymentGatewayIntent> {
    intent.metadata = {
      ...(intent.metadata ?? {}),
      mpPreferenceId: preferenceId,
    };
    return this.repo.save(intent);
  }

  async applyMpPayment(
    intent: PaymentGatewayIntent,
    payment: MpPaymentResponse,
  ): Promise<PaymentGatewayIntent> {
    const status = mapMpPaymentStatus(payment.status);
    intent.mpPaymentId = payment.id != null ? String(payment.id) : intent.mpPaymentId;
    intent.status = status;
    intent.metadata = {
      ...(intent.metadata ?? {}),
      mpRaw: payment as unknown as Record<string, unknown>,
      authorizationCode: payment.authorization_code ?? null,
      paymentType: payment.payment_type_id ?? null,
      cardLastFour: payment.card?.last_four_digits ?? null,
      statusDetail: payment.status_detail ?? null,
    };
    return this.repo.save(intent);
  }

  async applyMpOrder(
    intent: PaymentGatewayIntent,
    order: MpOrderResponse,
  ): Promise<PaymentGatewayIntent> {
    const payment = primaryMpOrderPayment(order);
    const status = mapMpOrderToIntentStatus({
      orderStatus: order.status,
      orderStatusDetail: order.status_detail,
      paymentStatus: payment?.status,
      paymentStatusDetail: payment?.status_detail,
    });

    if (order.id) intent.mpOrderId = String(order.id);
    if (payment?.id) intent.mpPaymentId = String(payment.id);
    intent.status = status;
    intent.metadata = {
      ...(intent.metadata ?? {}),
      mpRaw: order as unknown as Record<string, unknown>,
      paymentType: payment?.status_detail ?? order.status_detail ?? null,
      statusDetail: payment?.status_detail ?? order.status_detail ?? null,
    };
    return this.repo.save(intent);
  }

  async updateStatus(
    intent: PaymentGatewayIntent,
    status: PaymentGatewayIntentStatus,
  ): Promise<PaymentGatewayIntent> {
    intent.status = status;
    return this.repo.save(intent);
  }

  async markConsumed(
    intent: PaymentGatewayIntent,
    transactionId: string,
  ): Promise<PaymentGatewayIntent> {
    intent.status = 'CONSUMED';
    intent.transactionId = transactionId;
    return this.repo.save(intent);
  }

  async assertApprovedForSale(input: {
    companyId: string;
    intentId: string;
    amount: number;
  }): Promise<PaymentGatewayIntent> {
    const intent = await this.findById(input.companyId, input.intentId);
    if (intent.status !== 'APPROVED') {
      throw new BadRequestException('El pago Mercado Pago no está aprobado');
    }
    if (Math.abs(intent.amount - Math.round(input.amount)) > 1) {
      throw new BadRequestException('El monto del intent no coincide con el pago');
    }
    return intent;
  }

  toPublicDto(intent: PaymentGatewayIntent) {
    return {
      id: intent.id,
      channel: intent.channel,
      status: intent.status,
      amount: intent.amount,
      currency: intent.currency,
      mpPaymentId: intent.mpPaymentId,
      mpOrderId: intent.mpOrderId,
      mpPreferenceId: intent.metadata?.mpPreferenceId ?? null,
      externalReference: intent.externalReference,
      cashSessionId: intent.cashSessionId,
      pointOfSaleId: intent.pointOfSaleId,
      transactionId: intent.transactionId,
      metadata: intent.metadata,
      createdAt: intent.createdAt.toISOString(),
      updatedAt: intent.updatedAt.toISOString(),
    };
  }
}
