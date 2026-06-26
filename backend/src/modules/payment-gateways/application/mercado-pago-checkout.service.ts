import { BadRequestException, Injectable } from '@nestjs/common';
import { CompaniesService } from '@modules/companies/application/companies.service';
import { isMercadoPagoEshopCheckoutOperational } from '@modules/companies/domain/company-mercado-pago.types';
import { MercadoPagoClient } from './mercado-pago.client';
import { PaymentGatewayIntentService } from './payment-gateway-intent.service';
import { MercadoPagoEshopOrderSyncService } from './mercado-pago-eshop-order-sync.service';

function normalizePaymentMethodType(
  raw: string | undefined,
): 'credit_card' | 'debit_card' {
  const t = (raw ?? '').toLowerCase();
  if (t === 'debit_card' || t === 'debit') return 'debit_card';
  return 'credit_card';
}

@Injectable()
export class MercadoPagoCheckoutService {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly mpClient: MercadoPagoClient,
    private readonly intentService: PaymentGatewayIntentService,
    private readonly eshopSync: MercadoPagoEshopOrderSyncService,
  ) {}

  async confirmPayment(input: {
    companyId: string;
    intentId: string;
    token?: string;
    payerEmail: string;
    paymentMethodId?: string;
    paymentMethodType?: string;
    selectedPaymentMethod?: string;
    installments?: number;
    description?: string;
  }) {
    const settings = await this.companiesService.getMercadoPagoSettingsInternal(
      input.companyId,
    );
    if (!isMercadoPagoEshopCheckoutOperational(settings)) {
      throw new BadRequestException('Pago online eShop no está habilitado');
    }
    if (!settings.accessToken?.trim()) {
      throw new BadRequestException('Falta Access Token de Mercado Pago');
    }

    let intent = await this.intentService.findById(input.companyId, input.intentId);
    if (intent.channel !== 'ESHOP_CHECKOUT') {
      throw new BadRequestException('Intent no válido para checkout');
    }
    if (intent.status === 'APPROVED' || intent.status === 'CONSUMED') {
      return { ...this.intentService.toPublicDto(intent), awaitingWallet: false };
    }

    const selected = (input.selectedPaymentMethod ?? '').toLowerCase();
    if (selected === 'wallet_purchase' || selected === 'mercadopago') {
      return {
        ...this.intentService.toPublicDto(intent),
        awaitingWallet: true,
      };
    }

    const token = input.token?.trim();
    const paymentMethodId = input.paymentMethodId?.trim();
    if (!token) {
      throw new BadRequestException('No se pudo tokenizar la tarjeta');
    }
    if (!paymentMethodId) {
      throw new BadRequestException('Falta identificador del medio de pago (tarjeta)');
    }

    const order = await this.mpClient.createOrder({
      accessToken: settings.accessToken,
      environment: settings.environment,
      totalAmount: intent.amount,
      externalReference: intent.externalReference,
      token,
      paymentMethodId,
      paymentMethodType: normalizePaymentMethodType(input.paymentMethodType),
      installments: input.installments ?? 1,
      payerEmail: input.payerEmail.trim(),
      idempotencyKey: intent.idempotencyKey,
      description: input.description ?? `Pedido eShop ${intent.id.slice(0, 8)}`,
    });

    intent = await this.intentService.applyMpOrder(intent, order);
    await this.eshopSync.syncOnApprovedPayment(intent);
    return { ...this.intentService.toPublicDto(intent), awaitingWallet: false };
  }

  async getIntent(companyId: string, intentId: string) {
    const intent = await this.intentService.findById(companyId, intentId);
    return this.intentService.toPublicDto(intent);
  }
}
