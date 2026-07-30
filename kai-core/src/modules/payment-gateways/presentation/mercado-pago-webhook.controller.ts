import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { SkipTenant } from '@common/tenant';
import {
  MercadoPagoWebhookService,
  type MpWebhookNotification,
} from '../application/mercado-pago-webhook.service';

@Controller('webhooks')
export class MercadoPagoWebhookController {
  constructor(private readonly webhookService: MercadoPagoWebhookService) {}

  @Post('mercado-pago')
  @SkipTenant()
  async handleMercadoPago(
    @Body() body: unknown,
    @Query('data.id') queryDataId?: string,
    @Query('type') queryType?: string,
    @Headers('x-signature') xSignature?: string,
    @Headers('x-request-id') xRequestId?: string,
  ) {
    try {
      await this.webhookService.handleNotification({
        body: (body ?? {}) as MpWebhookNotification,
        queryDataId,
        queryType,
        xSignature,
        xRequestId,
      });
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw e;
    }
    return { received: true };
  }

  @Get('mercado-pago')
  @SkipTenant()
  mercadoPagoPing() {
    return { ok: true };
  }
}
