import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { CompaniesService } from '@modules/companies/application/companies.service';
import {
  MercadoPagoClient,
  primaryMpOrderPayment,
} from './mercado-pago.client';
import { PaymentGatewayIntentService } from './payment-gateway-intent.service';
import { MercadoPagoEshopOrderSyncService } from './mercado-pago-eshop-order-sync.service';
import { validateMercadoPagoWebhookSignature } from './mercado-pago-webhook-signature';

export type MpWebhookNotification = {
  type?: string;
  action?: string;
  data?: { id?: string };
  live_mode?: boolean;
};

@Injectable()
export class MercadoPagoWebhookService {
  private readonly logger = new Logger(MercadoPagoWebhookService.name);

  constructor(
    private readonly mpClient: MercadoPagoClient,
    private readonly companiesService: CompaniesService,
    private readonly intentService: PaymentGatewayIntentService,
    private readonly eshopSync: MercadoPagoEshopOrderSyncService,
  ) {}

  async handleNotification(input: {
    body: MpWebhookNotification;
    queryDataId?: string;
    queryType?: string;
    xSignature?: string;
    xRequestId?: string;
  }): Promise<void> {
    const body = input.body ?? {};
    const resourceType = (input.queryType ?? body.type ?? '').toLowerCase();
    const resourceId =
      input.queryDataId?.trim() ||
      (body.data?.id != null ? String(body.data.id) : '');

    if (!resourceId) {
      this.logger.warn('Webhook MP sin resource id');
      return;
    }

    if (resourceType === 'order' || resourceId.startsWith('ORD')) {
      await this.handleOrderNotification(resourceId, input);
      return;
    }

    await this.handleLegacyPaymentNotification(resourceId);
  }

  private resolveWebhookSecret(): string {
    return (process.env.MP_WEBHOOK_SECRET ?? '').trim();
  }

  private assertSignatureIfConfigured(input: {
    queryDataId?: string;
    xSignature?: string;
    xRequestId?: string;
  }): void {
    const secret = this.resolveWebhookSecret();
    if (!secret) {
      this.logger.debug(
        'MP_WEBHOOK_SECRET no configurado; se omite validación de firma (solo dev)',
      );
      return;
    }

    const dataId = (input.queryDataId ?? '').trim();
    const valid = validateMercadoPagoWebhookSignature({
      xSignature: input.xSignature ?? '',
      xRequestId: input.xRequestId ?? '',
      dataId,
      secret,
    });
    if (!valid) {
      throw new UnauthorizedException('Firma de webhook Mercado Pago inválida');
    }
  }

  private async handleOrderNotification(
    orderId: string,
    input: {
      queryDataId?: string;
      xSignature?: string;
      xRequestId?: string;
    },
  ): Promise<void> {
    const intent = await this.intentService.findByMpOrderId(orderId);
    if (!intent) {
      this.logger.warn(
        `Webhook MP order ${orderId} sin intent (¿aún no confirmado en checkout?)`,
      );
      return;
    }

    this.assertSignatureIfConfigured(input);

    const mpSettings = await this.companiesService.getMercadoPagoSettingsInternal(
      intent.companyId,
    );
    if (!mpSettings.accessToken?.trim()) return;

    const order = await this.mpClient.getOrder(
      mpSettings.accessToken,
      mpSettings.environment,
      orderId,
    );
    const updated = await this.intentService.applyMpOrder(intent, order);
    await this.eshopSync.syncOnApprovedPayment(updated);

    const payment = primaryMpOrderPayment(order);
    this.logger.log(
      `Webhook order ${orderId} → intent ${intent.id} status ${updated.status} (payment ${payment?.status ?? 'n/a'})`,
    );
  }

  private async handleLegacyPaymentNotification(paymentId: string): Promise<void> {
    let intent = await this.intentService.findByMpPaymentId(paymentId);
    let payment: Awaited<ReturnType<MercadoPagoClient['getPayment']>> | null = null;

    if (!intent) {
      payment = await this.fetchPaymentAcrossCompanies(paymentId);
      const extRef = payment?.external_reference?.trim();
      if (extRef) {
        intent = await this.intentService.findByExternalReference(extRef);
      }
    }

    if (!intent) {
      this.logger.warn(`Webhook MP sin intent para payment ${paymentId}`);
      return;
    }

    const mpSettings = await this.companiesService.getMercadoPagoSettingsInternal(
      intent.companyId,
    );
    if (!mpSettings.accessToken?.trim()) return;

    if (!payment) {
      payment = await this.mpClient.getPayment(
        mpSettings.accessToken,
        mpSettings.environment,
        paymentId,
      );
    }

    const updated = await this.intentService.applyMpPayment(intent, payment);
    await this.eshopSync.syncOnApprovedPayment(updated);
  }

  private async fetchPaymentAcrossCompanies(
    paymentId: string,
  ): Promise<Awaited<ReturnType<MercadoPagoClient['getPayment']>> | null> {
    const companies = await this.companiesService.listCompanyIdsWithMercadoPago();
    for (const companyId of companies) {
      const settings =
        await this.companiesService.getMercadoPagoSettingsInternal(companyId);
      if (!settings.accessToken?.trim()) continue;
      try {
        return await this.mpClient.getPayment(
          settings.accessToken,
          settings.environment,
          paymentId,
        );
      } catch {
        continue;
      }
    }
    return null;
  }
}
