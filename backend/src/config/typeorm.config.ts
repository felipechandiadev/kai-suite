import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppConfigService } from './config.service';
import 'reflect-metadata';

// Importar entidades usando path alias
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { CompanyPaymentMethodEntity } from '@modules/companies/domain/company-payment-method.entity';
import { CompanyVoucherKindEntity } from '@modules/companies/domain/company-voucher-kind.entity';
import { PosPaymentMethodEntity } from '@modules/companies/domain/pos-payment-method.entity';
import { PriceList } from '@modules/price-lists/domain/price-list.entity';
import { User } from '@modules/users/domain/user.entity';
import { UserCompanyMembership } from '@modules/users/domain/user-company-membership.entity';
import { UserCompanyRole } from '@modules/users/domain/user-company-role.entity';
import { UserCompanyPerson } from '@modules/users/domain/user-company-person.entity';
import { Person } from '@modules/persons/domain/person.entity';
import { CashSession } from '@modules/cash-sessions/domain/cash-session.entity';
import { CashHub } from '@modules/cash-hubs/domain/cash-hub.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { DocumentSequence } from '@modules/transactions/domain/document-sequence.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { Product } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { ProductVariantProductionUnit } from '@modules/product-variants/domain/product-variant-production-unit.entity';
import { ProductVariantBranchAvailability } from '@modules/product-variants/domain/product-variant-branch-availability.entity';
import { ProductVariantProductionAttribute } from '@modules/product-variants/domain/product-variant-production-attribute.entity';
import { ProductVariantProductionAttributeOption } from '@modules/product-variants/domain/product-variant-production-attribute-option.entity';
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
import { RecurringOperationalExpense } from '@modules/operational-expenses/domain/recurring-operational-expense.entity';
import { RecurringOperationalExpenseRun } from '@modules/operational-expenses/domain/recurring-operational-expense-run.entity';
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
import { WebPushSubscription } from '@modules/notifications/domain/web-push-subscription.entity';
import { EShopTestimonial } from '@modules/e-shop/domain/e-shop-testimonial.entity';
import { EShopHeroSlide } from '@modules/e-shop/domain/e-shop-hero-slide.entity';
import { EShopFulfillmentMethod } from '@modules/e-shop/domain/e-shop-fulfillment-method.entity';
import { EshopCustomerAccount } from '@modules/e-shop/domain/eshop-customer-account.entity';
import { EShopCart } from '@modules/e-shop/domain/e-shop-cart.entity';
import { EShopCartItem } from '@modules/e-shop/domain/e-shop-cart-item.entity';
import { EShopDeliveryCoverageCommune } from '@modules/delivery/domain/e-shop-delivery-coverage-commune.entity';
import { EShopDeliveryZone } from '@modules/delivery/domain/e-shop-delivery-zone.entity';
import { EShopDeliveryOccurrence } from '@modules/delivery/domain/e-shop-delivery-occurrence.entity';
import { EShopDeliveryOccurrenceZone } from '@modules/delivery/domain/e-shop-delivery-occurrence-zone.entity';
import { EShopDeliveryOrder } from '@modules/delivery/domain/e-shop-delivery-order.entity';
import { EShopDeliveryOrderLinePick } from '@modules/delivery/domain/e-shop-delivery-order-line-pick.entity';
import { EShopDeliveryDispatch } from '@modules/delivery/domain/e-shop-delivery-dispatch.entity';
import { EShopDeliveryStop } from '@modules/delivery/domain/e-shop-delivery-stop.entity';
import { EShopDeliverySettings } from '@modules/delivery/domain/e-shop-delivery-settings.entity';
import { PaymentGatewayIntent } from '@modules/payment-gateways/domain/payment-gateway-intent.entity';
import { PresaleTicket } from '@modules/presale-tickets/domain/presale-ticket.entity';
import { PresaleTicketLine } from '@modules/presale-tickets/domain/presale-ticket-line.entity';
import { FiscalProfile } from '@modules/fiscal/domain/fiscal-profile.entity';
import { FiscalCertificate } from '@modules/fiscal/domain/fiscal-certificate.entity';
import { FiscalCaf } from '@modules/fiscal/domain/fiscal-caf.entity';
import { FiscalCertificationRun } from '@modules/fiscal/domain/fiscal-certification-run.entity';
import { FiscalDteEmission } from '@modules/fiscal/domain/fiscal-dte-emission.entity';
import { PointOfSaleFolioAllocation } from '@modules/fiscal/domain/point-of-sale-folio-allocation.entity';
import { PosSyncCommand } from '@modules/pos-sync/domain/pos-sync-command.entity';
import { ProductionUnit } from '@modules/production-units/domain/production-unit.entity';
import { DiningRoom } from '@modules/dining/domain/dining-room.entity';
import { DiningTable } from '@modules/dining/domain/dining-table.entity';
import { DiningOrder } from '@modules/dining/domain/dining-order.entity';
import { DiningOrderLine } from '@modules/dining/domain/dining-order-line.entity';
import { DiningStationOrder } from '@modules/dining/domain/dining-station-order.entity';
import { DiningBranchSettings } from '@modules/dining/domain/dining-branch-settings.entity';
import { DiningOrderSequence } from '@modules/dining/domain/dining-order-sequence.entity';
import { DiningKitchenFireSequence } from '@modules/dining/domain/dining-kitchen-fire-sequence.entity';
import { HrJornadaConfig } from '@modules/hr-jornada/domain/hr-jornada-config.entity';
import { HrHoliday, HrHolidayOverride } from '@modules/hr-jornada/domain/hr-holiday.entity';
import { HrShiftTemplate } from '@modules/hr-jornada/domain/hr-shift-template.entity';
import { HrShiftInstance } from '@modules/hr-jornada/domain/hr-shift-instance.entity';
import { HrShiftAssignment } from '@modules/hr-jornada/domain/hr-shift-assignment.entity';
import { HrShiftException } from '@modules/hr-jornada/domain/hr-shift-exception.entity';
import { HrCompensatoryLedgerEntry } from '@modules/hr-jornada/domain/hr-compensatory-ledger-entry.entity';
import { HrScheduleFindingAudit } from '@modules/hr-jornada/domain/hr-schedule-finding-audit.entity';
import { HrEmployeeDocument } from '@modules/hr-jornada/domain/hr-employee-document.entity';
import { HrTimeEntry } from '@modules/hr-jornada/domain/hr-time-entry.entity';
import { PayrollLineSuggestion } from '@modules/remunerations/domain/payroll-line-suggestion.entity';
import { EmploymentContract } from '@modules/employees/domain/employment-contract.entity';
import { HrJobPosition } from '@modules/employees/domain/hr-job-position.entity';
import { HrAfpFund } from '@modules/employees/domain/hr-afp-fund.entity';
import { HrIsapre } from '@modules/employees/domain/hr-isapre.entity';
import { HrEmployeeTimelineEntry } from '@modules/employees/domain/hr-employee-timeline-entry.entity';
import { HrEmployeeShift } from '@modules/hr-jornada/domain/hr-employee-shift.entity';
import { HrLaborUnitShift } from '@modules/hr-jornada/domain/hr-labor-unit-shift.entity';
import { HrLaborUnitShiftMember } from '@modules/hr-jornada/domain/hr-labor-unit-shift-member.entity';
import { HrShiftSystem } from '@modules/hr-jornada/domain/hr-shift-system.entity';
import { HrLaborUnit } from '@modules/hr-labor-units/domain/hr-labor-unit.entity';
import { HrLaborUnitStorage } from '@modules/hr-labor-units/domain/hr-labor-unit-storage.entity';
import { HrLaborUnitBranch } from '@modules/hr-labor-units/domain/hr-labor-unit-branch.entity';
import { HrLaborUnitOrganizationalUnit } from '@modules/hr-labor-units/domain/hr-labor-unit-organizational-unit.entity';
import { HrLaborUnitProductionUnit } from '@modules/hr-labor-units/domain/hr-labor-unit-production-unit.entity';
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
      CompanyPaymentMethodEntity,
      CompanyVoucherKindEntity,
      PosPaymentMethodEntity,
      PriceList,
      User,
      UserCompanyMembership,
      UserCompanyRole,
      UserCompanyPerson,
      Person,
      CashSession,
      CashHub,
      Transaction,
      DocumentSequence,
      TransactionLine,
      Product,
      ProductVariant,
      ProductVariantProductionUnit,
      ProductVariantBranchAvailability,
      ProductVariantProductionAttribute,
      ProductVariantProductionAttributeOption,
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
      RecurringOperationalExpense,
      RecurringOperationalExpenseRun,
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
      WebPushSubscription,
      EShopTestimonial,
      EShopHeroSlide,
      EShopFulfillmentMethod,
      EshopCustomerAccount,
      EShopCart,
      EShopCartItem,
      EShopDeliveryCoverageCommune,
      EShopDeliveryZone,
      EShopDeliveryOccurrence,
      EShopDeliveryOccurrenceZone,
      EShopDeliveryOrder,
      EShopDeliveryOrderLinePick,
      EShopDeliveryDispatch,
      EShopDeliveryStop,
      EShopDeliverySettings,
      PaymentGatewayIntent,
      PresaleTicket,
      PresaleTicketLine,
      FiscalProfile,
      FiscalCertificate,
      FiscalCaf,
      FiscalCertificationRun,
      FiscalDteEmission,
      PointOfSaleFolioAllocation,
      PosSyncCommand,
      ProductionUnit,
      DiningRoom,
      DiningTable,
      DiningOrder,
      DiningOrderLine,
      DiningStationOrder,
      DiningBranchSettings,
      DiningOrderSequence,
      DiningKitchenFireSequence,
      HrJornadaConfig,
      HrHoliday,
      HrHolidayOverride,
      HrShiftTemplate,
      HrShiftInstance,
      HrShiftAssignment,
      HrShiftException,
      HrCompensatoryLedgerEntry,
      HrScheduleFindingAudit,
      HrEmployeeDocument,
      HrTimeEntry,
      PayrollLineSuggestion,
      EmploymentContract,
      HrJobPosition,
      HrAfpFund,
      HrIsapre,
      HrEmployeeTimelineEntry,
      HrEmployeeShift,
      HrLaborUnitShift,
      HrLaborUnitShiftMember,
      HrShiftSystem,
      HrLaborUnit,
      HrLaborUnitStorage,
      HrLaborUnitBranch,
      HrLaborUnitOrganizationalUnit,
      HrLaborUnitProductionUnit,
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
