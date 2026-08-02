import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentCompany } from '@common/tenant';
import { MercadoPagoPointService } from '../application/mercado-pago-point.service';
import { PaymentGatewayIntentService } from '../application/payment-gateway-intent.service';

@Controller('pos/mp-point')
export class MercadoPagoPosController {
  constructor(
    private readonly pointService: MercadoPagoPointService,
    private readonly intentService: PaymentGatewayIntentService,
  ) {}

  @Post('intents')
  createIntent(
    @CurrentCompany() companyId: string,
    @Body()
    body: {
      amount: number;
      cashSessionId: string;
      pointOfSaleId: string;
      saleAmount?: number | null;
      tipAmount?: number | null;
    },
  ) {
    return this.pointService.createPointIntent({
      companyId,
      amount: body.amount,
      cashSessionId: body.cashSessionId?.trim(),
      pointOfSaleId: body.pointOfSaleId?.trim(),
      saleAmount: body.saleAmount,
      tipAmount: body.tipAmount,
    });
  }

  @Get('intents/:id')
  getIntent(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.pointService.getIntent(companyId, id);
  }

  @Post('intents/:id/cancel')
  cancelIntent(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.pointService.cancelIntent(companyId, id);
  }

  @Post('intents/:id/consume')
  consumeIntent(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() body: { transactionId: string; amount: number },
  ) {
    return this.intentService
      .assertApprovedForSale({
        companyId,
        intentId: id,
        amount: body.amount,
      })
      .then((intent) =>
        this.intentService.markConsumed(intent, body.transactionId.trim()),
      )
      .then((intent) => this.intentService.toPublicDto(intent));
  }
}
