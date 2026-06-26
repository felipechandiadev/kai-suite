import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { typeOrmConfig } from './config/typeorm.config';
import { AppConfigService } from './config/config.service';
import { AppConfigModule } from './config/config.module';
import { AppController } from './app.controller';
import { EventsModule } from './shared/events/events.module';
import { CacheModule } from './shared/cache/cache.module';
import { HealthModule } from './modules/health/health.module';
import { PosModule } from './modules/points-of-sale/pos.module';
import { AuthModule } from './modules/auth/auth.module';
import { CashSessionsModule } from './modules/cash-sessions/cash-sessions.module';
import { CashHubsModule } from './modules/cash-hubs/cash-hubs.module';
import { TreasuryAccountsModule } from './modules/treasury-accounts/treasury-accounts.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ProductsModule } from './modules/products/products.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { MetalPricesModule } from './modules/metal-prices/metal-prices.module';
import { AuditsModule } from './modules/audits/audits.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { AccountingAccountsModule } from './modules/accounting-accounts/accounting-accounts.module';
import { AccountingRulesModule } from './modules/accounting-rules/accounting-rules.module';
import { AutomationModule } from './modules/automation/automation.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { BrandsModule } from './modules/brands/brands.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { ShareholdersModule } from './modules/shareholders/shareholders.module';
import { UnitsModule } from './modules/units/units.module';
import { BranchesModule } from './modules/branches/branches.module';
import { StoragesModule } from './modules/storages/storages.module';
import { PriceListsModule } from './modules/price-lists/price-lists.module';
import { UsersModule } from './modules/users/users.module';
import { TaxesModule } from './modules/taxes/taxes.module';
import { AttributesModule } from './modules/attributes/attributes.module';
import { BankMovementsModule } from './modules/bank-movements/bank-movements.module';
import { BankAccountsModule } from './modules/bank-accounts/bank-accounts.module';
import { CapitalContributionsModule } from './modules/capital-contributions/capital-contributions.module';
import { BankTransfersModule } from './modules/bank-transfers/bank-transfers.module';
import { BankWithdrawalsModule } from './modules/bank-withdrawals/bank-withdrawals.module';
import { PettyCashWithdrawalsModule } from './modules/petty-cash-withdrawals/petty-cash-withdrawals.module';
import { CashDepositsModule } from './modules/cash-deposits/cash-deposits.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { ResultCentersModule } from './modules/result-centers/result-centers.module';
import { OrganizationalUnitsModule } from './modules/organizational-units/organizational-units.module';
import { RemunerationsModule } from './modules/remunerations/remunerations.module';
import { PersonsModule } from './modules/persons/persons.module';
import { AccountingPeriodsModule } from './modules/accounting-periods/accounting-periods.module';
import { AccountBalancesModule } from './modules/account-balances/account-balances.module';
import { OperationalExpensesModule } from './modules/operational-expenses/operational-expenses.module';
import { ExpenseCategoriesModule } from './modules/expense-categories/expense-categories.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { ReceptionsModule } from './modules/receptions/receptions.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { StockRealtimeModule } from './modules/stock-realtime/stock-realtime.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { InstallmentsModule } from './modules/installments/installments.module';
import { MultimediaModule } from './modules/multimedia/multimedia.module';
import { ObservabilityModule } from './shared/observability.module';
import { TenantModule } from './common/tenant';
import { SupplierInvoicesModule } from './modules/supplier-invoices/supplier-invoices.module';
import { SupplierReceiptsModule } from './modules/supplier-receipts/supplier-receipts.module';
import { SupplierHonorariumReceiptsModule } from './modules/supplier-honorarium-receipts/supplier-honorarium-receipts.module';
import { SupplierGuidesModule } from './modules/supplier-guides/supplier-guides.module';
import { PurchasingSupplierDocumentsModule } from './modules/purchasing-supplier-documents/purchasing-supplier-documents.module';
import { RecipesModule } from './modules/recipes/recipes.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ChecksModule } from './modules/checks/checks.module';
import { QuotationsModule } from './modules/quotations/quotations.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { PaymentGatewaysModule } from './modules/payment-gateways/payment-gateways.module';

@Module({
  imports: [
    AppConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [AppConfigModule],
      useFactory: typeOrmConfig,
      inject: [AppConfigService],
    }),
    EventEmitterModule.forRoot(),
    EventsModule,
    CacheModule,
    TenantModule,
    StockRealtimeModule,
    NotificationsModule,
    HealthModule,
    PosModule,
    AuthModule,
    CompaniesModule,
    ShareholdersModule,
    BranchesModule,
    StoragesModule,
    PriceListsModule,
    UsersModule,
    TaxesModule,
    AttributesModule,
    BankMovementsModule,
    BankAccountsModule,
    ChecksModule,
    QuotationsModule,
    PromotionsModule,
    PaymentGatewaysModule,
    CapitalContributionsModule,
    BankTransfersModule,
    BankWithdrawalsModule,
    PettyCashWithdrawalsModule,
    CashDepositsModule,
    EmployeesModule,
    CashSessionsModule,
    CashHubsModule,
    TreasuryAccountsModule,
    CustomersModule,
    ProductsModule,
    PaymentsModule,
    TransactionsModule,
    MetalPricesModule,
    AuditsModule,
    AccountingModule,
    AccountingAccountsModule,
    AccountingRulesModule,
    AutomationModule,
    AccountingPeriodsModule,
    AccountBalancesModule,
    CategoriesModule,
    BrandsModule,
    ResultCentersModule,
    OrganizationalUnitsModule,
    OperationalExpensesModule,
    ExpenseCategoriesModule,
    SuppliersModule,
    ReceptionsModule,
    SupplierInvoicesModule,
    SupplierReceiptsModule,
    SupplierHonorariumReceiptsModule,
    SupplierGuidesModule,
    PurchasingSupplierDocumentsModule,
    RecipesModule,
    OrdersModule,
    InventoryModule,
    RemunerationsModule,
    PersonsModule,
    UnitsModule,
    MultimediaModule,
    // Product variants API
    require('./modules/product-variants/product-variants.module')
      .ProductVariantsModule,
    InstallmentsModule,
    // analytics dashboard module
    require('./modules/analytics/analytics.module').AnalyticsModule,
    require('./modules/e-shop/e-shop.module').EShopModule,
    ObservabilityModule,
    CacheModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
