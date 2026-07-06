import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { CashSessionsController } from './presentation/cash-sessions.controller';
import { CashSessionsService } from './application/cash-sessions.service';
import { CashSessionIntegrityService } from './application/cash-session-integrity.service';
import { CashSessionCoreService } from './application/cash-session-core.service';
import { SalesFromSessionService } from './application/sales-from-session.service';
import { SessionInventoryService } from './application/session-inventory.service';
import { CashSessionsServiceFacade } from './application/cash-sessions-facade.service';
import { CashSession } from '@modules/cash-sessions/domain/cash-session.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { User } from '@modules/users/domain/user.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { TreasuryAccount } from '@modules/treasury-accounts/domain/treasury-account.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { Product } from '@modules/products/domain/product.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { CashHubsModule } from '@modules/cash-hubs/cash-hubs.module';
import { CompaniesModule } from '@modules/companies/companies.module';
import { PromotionsModule } from '@modules/promotions/promotions.module';
import { ProductVariantsModule } from '@modules/product-variants/product-variants.module';
import { CustomersModule } from '@modules/customers/customers.module';
import { StockLevelsModule } from '@modules/stock-levels/stock-levels.module';
import { InstallmentsModule } from '@modules/installments/installments.module';
import { PaymentGatewaysModule } from '@modules/payment-gateways/payment-gateways.module';
import { PresaleTicketsModule } from '@modules/presale-tickets/presale-tickets.module';
import { MercadoPagoSalePaymentService } from '@modules/payment-gateways/application/mercado-pago-sale-payment.service';
import { FiscalModule } from '@modules/fiscal/fiscal.module';
import { AppConfigModule } from '../../config/config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CashSession,
      PointOfSale,
      User,
      Transaction,
      TransactionLine,
      ProductVariant,
      TreasuryAccount,
      StockLevel,
      Product,
      Storage,
      Unit,
    ]),
    TransactionsModule, // <-- NEW: For delegation of transaction creation
    CashHubsModule,
    CompaniesModule,
    PromotionsModule,
    ProductVariantsModule,
    CustomersModule,
    StockLevelsModule,
    InstallmentsModule,
    PaymentGatewaysModule,
    PresaleTicketsModule,
    FiscalModule,
    AppConfigModule,
    CqrsModule,
  ],
  controllers: [CashSessionsController],
  providers: [
    // Old services (kept for backward compatibility only)
    CashSessionsService,
    CashSessionIntegrityService,
    // NEW: Refactored services with single responsibilities
    CashSessionCoreService,
    SalesFromSessionService,
    SessionInventoryService,
    // Backward compatibility facade (routes legacy calls to new services)
    CashSessionsServiceFacade,
  ],
  exports: [
    // Backward compatibility: Export original service
    CashSessionsService,
    CashSessionIntegrityService,
    // NEW: Export refactored services (preferred by new code)
    CashSessionCoreService,
    SalesFromSessionService,
    SessionInventoryService,
    // Optional: Export facade for explicit migration path
    CashSessionsServiceFacade,
  ],
})
export class CashSessionsModule {}
