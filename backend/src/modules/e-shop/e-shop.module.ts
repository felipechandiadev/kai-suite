import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from '../../config/config.module';
import { EShopTestimonial } from './domain/e-shop-testimonial.entity';
import { EShopHeroSlide } from './domain/e-shop-hero-slide.entity';
import { EShopFulfillmentMethod } from './domain/e-shop-fulfillment-method.entity';
import { EshopCustomerAccount } from './domain/eshop-customer-account.entity';
import { EShopService } from './application/e-shop.service';
import { EShopPublicController } from './presentation/e-shop-public.controller';
import { EShopAdminController } from './presentation/e-shop-admin.controller';
import { EShopCustomerAuthController } from './presentation/e-shop-customer-auth.controller';
import { EShopCustomerMeController } from './presentation/e-shop-customer-me.controller';
import { EShopStoreGuard } from './presentation/eshop-store.guard';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Product } from '@modules/products/domain/product.entity';
import { Attribute } from '@modules/attributes/domain/attribute.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { User } from '@modules/users/domain/user.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { Category } from '@modules/categories/domain/category.entity';
import { Brand } from '@modules/brands/domain/brand.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import { Person } from '@modules/persons/domain/person.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { CompaniesModule } from '@modules/companies/companies.module';
import { MultimediaModule } from '@modules/multimedia/multimedia.module';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { CustomersModule } from '@modules/customers/customers.module';
import { InstallmentsModule } from '@modules/installments/installments.module';
import { EShopSchemaBootstrap } from './infrastructure/eshop-schema.bootstrap';
import { EShopFulfillmentMethodsService } from './application/eshop-fulfillment-methods.service';
import { EShopCustomerUpsertService } from './application/eshop-customer-upsert.service';
import { EShopCheckoutOrderService } from './application/eshop-checkout-order.service';
import { EShopOrderStatusService } from './application/eshop-order-status.service';
import { EShopOrderNotificationService } from './application/eshop-order-notification.service';
import { EshopCustomerOrderConvertService } from './application/eshop-customer-order-convert.service';
import { EshopCustomerAuthService } from './application/eshop-customer-auth.service';
import { EshopCustomerMeService } from './application/eshop-customer-me.service';
import { EshopCustomerGuard } from './presentation/eshop-customer.guard';
import { PaymentGatewaysModule } from '@modules/payment-gateways/payment-gateways.module';
import { KaiMailClient } from '@shared/mail/kai-mail.client';

@Module({
  imports: [
    AppConfigModule,
    TypeOrmModule.forFeature([
      EShopTestimonial,
      EShopHeroSlide,
      EShopFulfillmentMethod,
      ProductVariant,
      Product,
      Attribute,
      StockLevel,
      Branch,
      User,
      PriceListItem,
      Storage,
      Category,
      Brand,
      Customer,
      Person,
      Transaction,
      EshopCustomerAccount,
    ]),
    CompaniesModule,
    MultimediaModule,
    TransactionsModule,
    NotificationsModule,
    CustomersModule,
    InstallmentsModule,
    forwardRef(() => PaymentGatewaysModule),
  ],
  controllers: [
    EShopPublicController,
    EShopAdminController,
    EShopCustomerAuthController,
    EShopCustomerMeController,
  ],
  providers: [
    EShopService,
    EShopStoreGuard,
    EShopSchemaBootstrap,
    EShopFulfillmentMethodsService,
    EShopCustomerUpsertService,
    EShopCheckoutOrderService,
    EShopOrderStatusService,
    EShopOrderNotificationService,
    KaiMailClient,
    EshopCustomerOrderConvertService,
    EshopCustomerAuthService,
    EshopCustomerMeService,
    EshopCustomerGuard,
  ],
  exports: [EShopService, EShopStoreGuard],
})
export class EShopModule {}
