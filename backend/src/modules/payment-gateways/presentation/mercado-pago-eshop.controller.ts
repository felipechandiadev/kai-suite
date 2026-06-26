import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SkipTenant } from '@common/tenant';
import { UseGuards } from '@nestjs/common';
import { EShopStoreGuard } from '@modules/e-shop/presentation/eshop-store.guard';
import { EShopStore } from '@modules/e-shop/presentation/eshop-store.decorator';
import type { EShopStoreContext } from '@modules/e-shop/application/eshop-store.context';
import { MercadoPagoCheckoutService } from '../application/mercado-pago-checkout.service';

@Controller('e-shop')
@SkipTenant()
@UseGuards(EShopStoreGuard)
export class MercadoPagoEshopController {
  constructor(private readonly checkoutService: MercadoPagoCheckoutService) {}

  @Post('checkout/confirm-payment')
  confirmPayment(
    @EShopStore() store: EShopStoreContext,
    @Body()
    body: {
      intentId: string;
      token: string;
      payerEmail: string;
      description?: string;
    },
  ) {
    return this.checkoutService.confirmPayment({
      companyId: store.companyId,
      intentId: body.intentId?.trim(),
      token: body.token?.trim(),
      payerEmail: body.payerEmail?.trim(),
      description: body.description,
    });
  }

  @Get('checkout/payment-status/:intentId')
  paymentStatus(
    @EShopStore() store: EShopStoreContext,
    @Param('intentId') intentId: string,
  ) {
    return this.checkoutService.getIntent(store.companyId, intentId);
  }
}
