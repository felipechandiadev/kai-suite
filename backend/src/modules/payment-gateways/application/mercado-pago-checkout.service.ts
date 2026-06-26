import { BadRequestException, Injectable } from '@nestjs/common';
import { CompaniesService } from '@modules/companies/application/companies.service';
import { MercadoPagoClient } from './mercado-pago.client';
import { PaymentGatewayIntentService } from './payment-gateway-intent.service';

@Injectable()
export class MercadoPagoCheckoutService {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly mpClient: MercadoPagoClient,
    private readonly intentService: PaymentGatewayIntentService,
  ) {}

  async confirmPayment(input: {
    companyId: string;
    intentId: string;
    token: string;
    payerEmail: string;
    description?: string;
  }) {
    const settings = await this.companiesService.getMercadoPagoSettingsInternal(
      input.companyId,
    );
    if (!settings.enabled || !settings.eshopOnlinePaymentEnabled) {
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
      return this.intentService.toPublicDto(intent);
    }

    const payment = await this.mpClient.createCardPayment({
      accessToken: settings.accessToken,
      environment: settings.environment,
      amount: intent.amount,
      token: input.token.trim(),
      description: input.description ?? `Pedido eShop ${intent.id.slice(0, 8)}`,
      externalReference: intent.externalReference,
      payerEmail: input.payerEmail.trim(),
      idempotencyKey: intent.idempotencyKey,
    });

    intent = await this.intentService.applyMpPayment(intent, payment);
    return this.intentService.toPublicDto(intent);
  }

  async getIntent(companyId: string, intentId: string) {
    const intent = await this.intentService.findById(companyId, intentId);
    return this.intentService.toPublicDto(intent);
  }
}
