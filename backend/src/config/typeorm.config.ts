import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppConfigService } from './config.service';
import 'reflect-metadata';

// Importar entidades usando path alias
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { PriceList } from '@modules/price-lists/domain/price-list.entity';
import { User } from '@modules/users/domain/user.entity';
import { Person } from '@modules/persons/domain/person.entity';
import { CashSession } from '@modules/cash-sessions/domain/cash-session.entity';
import { CashHub } from '@modules/cash-hubs/domain/cash-hub.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { DocumentSequence } from '@modules/transactions/domain/document-sequence.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { Product } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import { Tax } from '@modules/taxes/domain/tax.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { Category } from '@modules/categories/domain/category.entity';
import { Brand } from '@modules/brands/domain/brand.entity';
import { Supplier } from '@modules/suppliers/domain/supplier.entity';
import { TreasuryAccount } from '@modules/treasury-accounts/domain/treasury-account.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { ResultCenter } from '@modules/result-centers/domain/result-center.entity';
import { ExpenseCategory } from '@modules/expense-categories/domain/expense-category.entity';
import { OperationalExpense } from '@modules/operational-expenses/domain/operational-expense.entity';
import { AccountingAccount } from '@modules/accounting-accounts/domain/accounting-account.entity';
import { AccountingRule } from '@modules/accounting-rules/domain/accounting-rule.entity';
import { AccountingPeriod } from '@modules/accounting-periods/domain/accounting-period.entity';
import { AccountingPeriodSnapshot } from '@modules/accounting-period-snapshots/domain/accounting-period-snapshot.entity';
import { AccountBalance } from '@modules/account-balances/domain/account-balance.entity';
import { Attribute } from '@modules/attributes/domain/attribute.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import { MetalPrice } from '@modules/metal-prices/domain/metal-price.entity';
import { Audit } from '@modules/audits/domain/audit.entity';
import { Permission } from '@modules/permissions/domain/permission.enum';
import { LedgerEntry } from '@modules/ledger-entries/domain/ledger-entry.entity';
import { OrganizationalUnit } from '@modules/organizational-units/domain/organizational-unit.entity';
import { Employee } from '@modules/employees/domain/employee.entity';
import { Shareholder } from '@modules/shareholders/domain/shareholder.entity';
import { Budget } from '@modules/budgets/domain/budget.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { Reception } from '@modules/receptions/domain/reception.entity';
import { ReceptionLine } from '@modules/receptions/domain/reception-line.entity';
import { Installment } from '@modules/installments/domain/installment.entity';
import { MultimediaAsset } from '@modules/multimedia/domain/multimedia-asset.entity';
import { MultimediaLink } from '@modules/multimedia/domain/multimedia-link.entity';
import { AccountingRuleLine } from '@modules/accounting-rules/domain/accounting-rule-line.entity';
import { AutomationRule } from '@modules/automation/domain/automation-rule.entity';
import { AutomationAction } from '@modules/automation/domain/automation-action.entity';
import { Recipe } from '@modules/recipes/domain/recipe.entity';
import { RecipeLine } from '@modules/recipes/domain/recipe-line.entity';
import { Check } from '@modules/checks/domain/check.entity';
import { CheckTransactionLink } from '@modules/checks/domain/check-transaction-link.entity';
import { CheckEvent } from '@modules/checks/domain/check-event.entity';
import { Promotion } from '@modules/promotions/domain/promotion.entity';
import { PromotionScopeBranch } from '@modules/promotions/domain/promotion-scope-branch.entity';
import { PromotionScopePos } from '@modules/promotions/domain/promotion-scope-pos.entity';
import { PromotionScopeProduct } from '@modules/promotions/domain/promotion-scope-product.entity';
import { PromotionScopeVariant } from '@modules/promotions/domain/promotion-scope-variant.entity';
import { PromotionScopeCategory } from '@modules/promotions/domain/promotion-scope-category.entity';
import { PromotionScopeCustomer } from '@modules/promotions/domain/promotion-scope-customer.entity';
import { PromotionScopePaymentMethod } from '@modules/promotions/domain/promotion-scope-payment-method.entity';
import { PromotionRedemption } from '@modules/promotions/domain/promotion-redemption.entity';
import { Notification } from '@modules/notifications/domain/notification.entity';
import { NotificationDelivery } from '@modules/notifications/domain/notification-delivery.entity';
import { NotificationAudience } from '@modules/notifications/domain/notification-audience.entity';
import { NotificationPreference } from '@modules/notifications/domain/notification-preference.entity';
import { NotificationRetentionPolicy } from '@modules/notifications/domain/notification-retention-policy.entity';
import { EShopTestimonial } from '@modules/e-shop/domain/e-shop-testimonial.entity';
import { EShopHeroSlide } from '@modules/e-shop/domain/e-shop-hero-slide.entity';
import { EShopFulfillmentMethod } from '@modules/e-shop/domain/e-shop-fulfillment-method.entity';
import { EshopCustomerAccount } from '@modules/e-shop/domain/eshop-customer-account.entity';
import { PaymentGatewayIntent } from '@modules/payment-gateways/domain/payment-gateway-intent.entity';
import { AuditSubscriber } from '../subscribers/AuditSubscriber';
import { TenantSubscriber } from '../common/tenant/tenant.subscriber';

export const typeOrmConfig = (
  configService: AppConfigService,
): TypeOrmModuleOptions =>
  ({
    type: configService.database.type,
    host: configService.database.host,
    port: configService.database.port,
    username: configService.database.username,
    password: configService.database.password,
    database: configService.database.database,

    // Usar array de entidades importadas explícitamente
    entities: [
      PointOfSale,
      Branch,
      Company,
      PriceList,
      User,
      Person,
      CashSession,
      CashHub,
      Transaction,
      DocumentSequence,
      TransactionLine,
      Product,
      ProductVariant,
      Customer,
      Tax,
      Unit,
      Category,
      Brand,
      Supplier,
      TreasuryAccount,
      Storage,
      ResultCenter,
      ExpenseCategory,
      OperationalExpense,
      AccountingAccount,
      AccountingRule,
      AccountingRuleLine,
      AutomationRule,
      AutomationAction,
      Recipe,
      RecipeLine,
      AccountingPeriod,
      AccountingPeriodSnapshot,
      AccountBalance,
      Attribute,
      PriceListItem,
      MetalPrice,
      Audit,
      Permission,
      LedgerEntry,
      OrganizationalUnit,
      Employee,
      Shareholder,
      Budget,
      StockLevel,
      Reception,
      ReceptionLine,
      Installment,
      MultimediaAsset,
      MultimediaLink,
      Check,
      CheckTransactionLink,
      CheckEvent,
      Promotion,
      PromotionScopeBranch,
      PromotionScopePos,
      PromotionScopeProduct,
      PromotionScopeVariant,
      PromotionScopeCategory,
      PromotionScopeCustomer,
      PromotionScopePaymentMethod,
      PromotionRedemption,
      Notification,
      NotificationDelivery,
      NotificationAudience,
      NotificationPreference,
      NotificationRetentionPolicy,
      EShopTestimonial,
      EShopHeroSlide,
      EShopFulfillmentMethod,
      EshopCustomerAccount,
      PaymentGatewayIntent,
    ],

    // Register subscribers (TypeORM EventSubscribers)
    subscribers: [AuditSubscriber, TenantSubscriber],

    synchronize: configService.database.synchronize,
    logging: configService.database.logging,

    // SSL Configuration
    ...(configService.database.ssl && {
      ssl: {
        rejectUnauthorized: false, // Accept self-signed certificates
      },
    }),

    extra: {
      connectionLimit: configService.database.maxConnections,
      acquireTimeout: configService.database.connectionTimeout,
      timeout: configService.database.connectionTimeout,
    } as any,
  }) as TypeOrmModuleOptions;
