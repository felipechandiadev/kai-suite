import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesModule } from '@modules/companies/companies.module';
import { EShopModule } from '@modules/e-shop/e-shop.module';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { PaymentGatewayIntent } from './domain/payment-gateway-intent.entity';
import { MercadoPagoClient } from './application/mercado-pago.client';
import { PaymentGatewayIntentService } from './application/payment-gateway-intent.service';
import { MercadoPagoWebhookService } from './application/mercado-pago-webhook.service';
import { MercadoPagoPointService } from './application/mercado-pago-point.service';
import { MercadoPagoCheckoutService } from './application/mercado-pago-checkout.service';
import { MercadoPagoSalePaymentService } from './application/mercado-pago-sale-payment.service';
import { MercadoPagoWebhookController } from './presentation/mercado-pago-webhook.controller';
import { MercadoPagoPosController } from './presentation/mercado-pago-pos.controller';
import { MercadoPagoEshopController } from './presentation/mercado-pago-eshop.controller';

@Module({
  imports: [
    CompaniesModule,
    forwardRef(() => EShopModule),
    TypeOrmModule.forFeature([PaymentGatewayIntent, Transaction]),
  ],
  controllers: [
    MercadoPagoWebhookController,
    MercadoPagoPosController,
    MercadoPagoEshopController,
  ],
  providers: [
    MercadoPagoClient,
    PaymentGatewayIntentService,
    MercadoPagoWebhookService,
    MercadoPagoPointService,
    MercadoPagoCheckoutService,
    MercadoPagoSalePaymentService,
  ],
  exports: [
    PaymentGatewayIntentService,
    MercadoPagoPointService,
    MercadoPagoCheckoutService,
    MercadoPagoClient,
    MercadoPagoSalePaymentService,
  ],
})
export class PaymentGatewaysModule {}
