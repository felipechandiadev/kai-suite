import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SkipTenant } from '@common/tenant';
import { MercadoPagoWebhookService } from '../application/mercado-pago-webhook.service';

@Controller('webhooks')
export class MercadoPagoWebhookController {
  constructor(private readonly webhookService: MercadoPagoWebhookService) {}

  @Post('mercado-pago')
  @SkipTenant()
  async handleMercadoPago(@Body() body: unknown) {
    await this.webhookService.handleNotification(
      (body ?? {}) as {
        type?: string;
        action?: string;
        data?: { id?: string };
      },
    );
    return { received: true };
  }

  @Get('mercado-pago')
  @SkipTenant()
  mercadoPagoPing() {
    return { ok: true };
  }
}
