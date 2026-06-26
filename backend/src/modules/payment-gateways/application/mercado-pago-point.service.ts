import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { CompaniesService } from '@modules/companies/application/companies.service';
import { MercadoPagoClient } from './mercado-pago.client';
import { PaymentGatewayIntentService } from './payment-gateway-intent.service';

@Injectable()
export class MercadoPagoPointService {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly mpClient: MercadoPagoClient,
    private readonly intentService: PaymentGatewayIntentService,
  ) {}

  async createPointIntent(input: {
    companyId: string;
    amount: number;
    cashSessionId: string;
    pointOfSaleId: string;
  }) {
    const settings = await this.companiesService.getMercadoPagoSettingsInternal(
      input.companyId,
    );
    if (!settings.enabled || !settings.posPointEnabled) {
      throw new BadRequestException('Mercado Pago Point no está habilitado');
    }
    if (!settings.accessToken?.trim()) {
      throw new BadRequestException('Falta Access Token de Mercado Pago');
    }
    if (!settings.pointTerminalId?.trim()) {
      throw new BadRequestException('Falta ID de terminal Point');
    }

    let intent = await this.intentService.createIntent({
      companyId: input.companyId,
      channel: 'POS_POINT',
      amount: input.amount,
      cashSessionId: input.cashSessionId,
      pointOfSaleId: input.pointOfSaleId,
    });

    try {
      const mpRes = await this.mpClient.createPointPaymentIntent({
        accessToken: settings.accessToken,
        environment: settings.environment,
        deviceId: settings.pointTerminalId.trim(),
        amount: intent.amount,
        externalReference: intent.externalReference,
        description: `Venta POS ${intent.id.slice(0, 8)}`,
      });

      const payment = mpRes.payment;
      if (payment?.id != null) {
        intent.mpPaymentId = String(payment.id);
      }
      if (mpRes.id) {
        intent.mpOrderId = String(mpRes.id);
      }
      intent.status = 'PENDING';
      intent = await this.intentService.applyMpPayment(
        intent,
        payment ?? { status: 'pending', id: mpRes.id },
      );
    } catch (e) {
      intent = await this.intentService.updateStatus(intent, 'PENDING');
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Error al crear cobro Point',
      );
    }

    return this.intentService.toPublicDto(intent);
  }

  async getIntent(companyId: string, intentId: string) {
    const intent = await this.intentService.findById(companyId, intentId);
    const settings = await this.companiesService.getMercadoPagoSettingsInternal(
      companyId,
    );

    if (
      intent.mpPaymentId &&
      settings.accessToken?.trim() &&
      (intent.status === 'PENDING' || intent.status === 'CREATED')
    ) {
      try {
        const payment = await this.mpClient.getPayment(
          settings.accessToken,
          settings.environment,
          intent.mpPaymentId,
        );
        const updated = await this.intentService.applyMpPayment(intent, payment);
        return this.intentService.toPublicDto(updated);
      } catch {
        // polling tolerante
      }
    }

    return this.intentService.toPublicDto(intent);
  }

  async cancelIntent(companyId: string, intentId: string) {
    const intent = await this.intentService.findById(companyId, intentId);
    if (intent.status === 'APPROVED' || intent.status === 'CONSUMED') {
      throw new BadRequestException('No se puede cancelar un pago aprobado');
    }
    const updated = await this.intentService.updateStatus(intent, 'CANCELLED');
    return this.intentService.toPublicDto(updated);
  }
}
