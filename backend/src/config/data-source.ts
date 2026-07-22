import { DataSource } from 'typeorm';
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar igual que en desarrollo: .env y opcional .env.local / .env.development (override)
const _dsRoot = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(_dsRoot, '.env') });
dotenv.config({ path: path.join(_dsRoot, '.env.local') });
dotenv.config({ path: path.join(_dsRoot, '.env.development') });

// Import all entities
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { PriceList } from '@modules/price-lists/domain/price-list.entity';
import { User } from '@modules/users/domain/user.entity';
import { UserCompanyMembership } from '@modules/users/domain/user-company-membership.entity';
import { UserCompanyRole } from '@modules/users/domain/user-company-role.entity';
import { UserCompanyPerson } from '@modules/users/domain/user-company-person.entity';
import { Person } from '@modules/persons/domain/person.entity';
import { CashSession } from '@modules/cash-sessions/domain/cash-session.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { DocumentSequence } from '@modules/transactions/domain/document-sequence.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { Product } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { ProductVariantProductionUnit } from '@modules/product-variants/domain/product-variant-production-unit.entity';
import { ProductVariantBranchAvailability } from '@modules/product-variants/domain/product-variant-branch-availability.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import { Tax } from '@modules/taxes/domain/tax.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { Category } from '@modules/categories/domain/category.entity';
import { Brand } from '@modules/brands/domain/brand.entity';
import { ProductionUnit } from '@modules/production-units/domain/production-unit.entity';
import { DiningRoom } from '@modules/dining/domain/dining-room.entity';
import { DiningTable } from '@modules/dining/domain/dining-table.entity';
import { DiningOrder } from '@modules/dining/domain/dining-order.entity';
import { DiningOrderLine } from '@modules/dining/domain/dining-order-line.entity';
import { DiningBranchSettings } from '@modules/dining/domain/dining-branch-settings.entity';
import { DiningOrderSequence } from '@modules/dining/domain/dining-order-sequence.entity';
import { DiningKitchenFireSequence } from '@modules/dining/domain/dining-kitchen-fire-sequence.entity';
import { Supplier } from '@modules/suppliers/domain/supplier.entity';
import { TreasuryAccount } from '@modules/treasury-accounts/domain/treasury-account.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { ResultCenter } from '@modules/result-centers/domain/result-center.entity';
import { ExpenseCategory } from '@modules/expense-categories/domain/expense-category.entity';
import { OperationalExpense } from '@modules/operational-expenses/domain/operational-expense.entity';
import { RecurringOperationalExpense } from '@modules/operational-expenses/domain/recurring-operational-expense.entity';
import { RecurringOperationalExpenseRun } from '@modules/operational-expenses/domain/recurring-operational-expense-run.entity';
import { RecurringOperationalExpenses1757280000000 } from '../migrations/1757280000000-RecurringOperationalExpenses';
import { DiningPosAccountsMenuCategories1757290000000 } from '../migrations/1757290000000-DiningPosAccountsMenuCategories';
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
import { CashHub } from '@modules/cash-hubs/domain/cash-hub.entity';
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
import { AuditSubscriber } from '../subscribers/AuditSubscriber';
import { TenantSubscriber } from '../common/tenant/tenant.subscriber';
import { AddTaxNonDeletable1740000000000 } from '../migrations/1740000000000-AddTaxNonDeletable';
import { CashHubsAndSessionToHub1741000000000 } from '../migrations/1741000000000-CashHubsAndSessionToHub';
import { AddCashSessionToHubTransferAccountingRuleEnum1741100000000 } from '../migrations/1741100000000-AddCashSessionToHubTransferAccountingRuleEnum';
import { MultiCompanyInit1742000000000 } from '../migrations/1742000000000-MultiCompanyInit';
import { PosSettingsJson1743000000000 } from '../migrations/1743000000000-PosSettingsJson';
import { Checks1744000000000 } from '../migrations/1744000000000-Checks';
import { Quotations1745000000000 } from '../migrations/1745000000000-Quotations';
import { EnsureDocumentSequences1746000000000 } from '../migrations/1746000000000-EnsureDocumentSequences';
import { Promotions1748000000000 } from '../migrations/1748000000000-Promotions';
import { SuperAdminRoleAndUserNonDeletable1749000000000 } from '../migrations/1749000000000-SuperAdminRoleAndUserNonDeletable';
import { ProductVariantUomTriplet1750000000000 } from '../migrations/1750000000000-ProductVariantUomTriplet';
import { ProductVariantCountStockBridge1751000000000 } from '../migrations/1751000000000-ProductVariantCountStockBridge';
import { PointOfSaleStorage1752000000000 } from '../migrations/1752000000000-PointOfSaleStorage';
import { StockLevelThresholds1753000000000 } from '../migrations/1753000000000-StockLevelThresholds';
import { ProductVariantShippingLogistics1753100000000 } from '../migrations/1753100000000-ProductVariantShippingLogistics';
import { CompanyAddressMail1755000000000 } from '../migrations/1755000000000-CompanyAddressMail';
import { BrandsAndProductBrandId1756000000000 } from '../migrations/1756000000000-BrandsAndProductBrandId';
import { BrandsIdDefaultGenRandomUuid1756010000000 } from '../migrations/1756010000000-BrandsIdDefaultGenRandomUuid';
import { ProductTypeManufacturadoElaboradoPreparado1756020000000 } from '../migrations/1756020000000-ProductTypeManufacturadoElaboradoPreparado';
import { RemovePaymentOutTransactionTypes1756030000000 } from '../migrations/1756030000000-RemovePaymentOutTransactionTypes';
import { PersonDocumentTypeDni1756040000000 } from '../migrations/1756040000000-PersonDocumentTypeDni';
import { BackorderTransactionType1756050000000 } from '../migrations/1756050000000-BackorderTransactionType';
import { AddCustomerCreditNoteAndOrderAdvancePaymentMethods1756060000000 } from '../migrations/1756060000000-AddCustomerCreditNoteAndOrderAdvancePaymentMethods';
import { SyncCommittedStockFromReservations1756070000000 } from '../migrations/1756070000000-SyncCommittedStockFromReservations';
import { UnitIsDefault1756080000000 } from '../migrations/1756080000000-UnitIsDefault';
import { NotificationsCore1756090000000 } from '../migrations/1756090000000-NotificationsCore';
import { StockThresholdEnabledFlags1756100000000 } from '../migrations/1756100000000-StockThresholdEnabledFlags';
import { CashHubCompanyCodeUnique1756110000000 } from '../migrations/1756110000000-CashHubCompanyCodeUnique';
import { CompanyPhone1756200000000 } from '../migrations/1756200000000-CompanyPhone';
import { RemoveProductVariantLegacyWeight1756220000000 } from '../migrations/1756220000000-RemoveProductVariantLegacyWeight';
import { EShopModule1756300000000 } from '../migrations/1756300000000-EShopModule';
import { EShopHeroSlides1756400000000 } from '../migrations/1756400000000-EShopHeroSlides';
import { EShopHeroSlideCtaStyle1756410000000 } from '../migrations/1756410000000-EShopHeroSlideCtaStyle';
import { MultimediaLinkAttributeId1756440000000 } from '../migrations/1756440000000-MultimediaLinkAttributeId';
import { PriceListNonDeletable1756450000000 } from '../migrations/1756450000000-PriceListNonDeletable';
import { EShopDefaultStorageBackfill1756460000000 } from '../migrations/1756460000000-EShopDefaultStorageBackfill';
import { CompanyPublicContactBackfill1756470000000 } from '../migrations/1756470000000-CompanyPublicContactBackfill';
import { CompanyIdentityBackfill1756480000000 } from '../migrations/1756480000000-CompanyIdentityBackfill';
import { CustomerCreditNotePayoutTransactionType1756490000000 } from '../migrations/1756490000000-CustomerCreditNotePayoutTransactionType';
import { OperationalExpenseDocumentKindAndPaymentStatus1756500000000 } from '../migrations/1756500000000-OperationalExpenseDocumentKindAndPaymentStatus';
import { EShopFulfillmentMethods1756510000000 } from '../migrations/1756510000000-EShopFulfillmentMethods';
import { EShopCustomerAccounts1756520000000 } from '../migrations/1756520000000-EShopCustomerAccounts';
import { EShopCustomerAccountUsername1756530000000 } from '../migrations/1756530000000-EShopCustomerAccountUsername';
import { PaymentGatewayIntents1756540000000 } from '../migrations/1756540000000-PaymentGatewayIntents';
import { PaymentGatewayIntentMpOrderIdIndex1756550000000 } from '../migrations/1756550000000-PaymentGatewayIntentMpOrderIdIndex';
import { PresaleTickets1756560000000 } from '../migrations/1756560000000-PresaleTickets';
import { FiscalCore1756570000000 } from '../migrations/1756570000000-FiscalCore';
import { CompanySiiEmisorFields1756580000000 } from '../migrations/1756580000000-CompanySiiEmisorFields';
import { FiscalDteEmissions1756590000000 } from '../migrations/1756590000000-FiscalDteEmissions';
import { PosFiscalAllocations1756600000000 } from '../migrations/1756600000000-PosFiscalAllocations';
import { FolioPackagesAndSubAllocations1756610000000 } from '../migrations/1756610000000-FolioPackagesAndSubAllocations';
import { FiscalDteEmissionAsync1756700000000 } from '../migrations/1756700000000-FiscalDteEmissionAsync';
import { PosSyncCommands1756710000000 } from '../migrations/1756710000000-PosSyncCommands';
import { PosSyncCashSessionId1756720000000 } from '../migrations/1756720000000-PosSyncCashSessionId';
import { ProductVariantFiscalFields1756730000000 } from '../migrations/1756730000000-ProductVariantFiscalFields';
import { MultiSubPackPerPos1756740000000 } from '../migrations/1756740000000-MultiSubPackPerPos';
import { EShopCarts1756750000000 } from '../migrations/1756750000000-EShopCarts';
import { EShopDeliveryCore1756760000000 } from '../migrations/1756760000000-EShopDeliveryCore';
import { CourierRole1756770000000 } from '../migrations/1756770000000-CourierRole';
import { EShopCanonicalFulfillmentMethods1756780000000 } from '../migrations/1756780000000-EShopCanonicalFulfillmentMethods';
import { EShopDeliveryPostgisGeometry1756790000000 } from '../migrations/1756790000000-EShopDeliveryPostgisGeometry';
import { EShopDeliveryOrderLinePicks1756800000000 } from '../migrations/1756800000000-EShopDeliveryOrderLinePicks';
import { EShopDeliveryOccurrenceKindAndEndTime1756810000000 } from '../migrations/1756810000000-EShopDeliveryOccurrenceKindAndEndTime';
import { RenameEShopDeliveryTablesToDelivery1756820000000 } from '../migrations/1756820000000-RenameEShopDeliveryTablesToDelivery';
import { PersonDocumentTypeRunToRut1756900000000 } from '../migrations/1756900000000-PersonDocumentTypeRunToRut';
import { PersonDocumentTypeDniToOther1756910000000 } from '../migrations/1756910000000-PersonDocumentTypeDniToOther';
import { BackfillPaymentInBankAccountKey1756920000000 } from '../migrations/1756920000000-BackfillPaymentInBankAccountKey';
import { ProductionUnits1756930000000 } from '../migrations/1756930000000-ProductionUnits';
import { Dining1756940000000 } from '../migrations/1756940000000-Dining';
import { DiningOrderNumbering1756950000000 } from '../migrations/1756950000000-DiningOrderNumbering';
import { DiningOpenTablePolicy1756960000000 } from '../migrations/1756960000000-DiningOpenTablePolicy';
import { VariantProductionUnitRouting1756970000000 } from '../migrations/1756970000000-VariantProductionUnitRouting';
import { ProductionUnitScopeAndMode1756980000000 } from '../migrations/1756980000000-ProductionUnitScopeAndMode';
import { VariantBranchAvailability1756990000000 } from '../migrations/1756990000000-VariantBranchAvailability';
import { StorageProductionInputCategory1757000000000 } from '../migrations/1757000000000-StorageProductionInputCategory';
import { StorageProductionInputsType1757010000000 } from '../migrations/1757010000000-StorageProductionInputsType';
import { StorageProductionInputsTypeBackfill1757020000000 } from '../migrations/1757020000000-StorageProductionInputsTypeBackfill';
import { UserCompanyMemberships1757100000000 } from '../migrations/1757100000000-UserCompanyMemberships';
import { ProductTypeInsumo1757110000000 } from '../migrations/1757110000000-ProductTypeInsumo';
import { RecipeCtpAndDiningMaterialReservation1757120000000 } from '../migrations/1757120000000-RecipeCtpAndDiningMaterialReservation';
import { NotificationDomainCatalog1757130000000 } from '../migrations/1757130000000-NotificationDomainCatalog';
import { WebPushSubscriptions1757300000000 } from '../migrations/1757300000000-WebPushSubscriptions';
import { DiningKitchenFireId1757140000000 } from '../migrations/1757140000000-DiningKitchenFireId';
import { DiningKitchenFireNumber1757150000000 } from '../migrations/1757150000000-DiningKitchenFireNumber';
import { ProductionUnitPurpose1757160000000 } from '../migrations/1757160000000-ProductionUnitPurpose';
import { FiscalProfile } from '@modules/fiscal/domain/fiscal-profile.entity';
import { FiscalCertificate } from '@modules/fiscal/domain/fiscal-certificate.entity';
import { FiscalCaf } from '@modules/fiscal/domain/fiscal-caf.entity';
import { FiscalCertificationRun } from '@modules/fiscal/domain/fiscal-certification-run.entity';
import { FiscalDteEmission } from '@modules/fiscal/domain/fiscal-dte-emission.entity';
import { PointOfSaleFolioAllocation } from '@modules/fiscal/domain/point-of-sale-folio-allocation.entity';
import { PosSyncCommand } from '@modules/pos-sync/domain/pos-sync-command.entity';
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
import { Notification } from '@modules/notifications/domain/notification.entity';
import { NotificationDelivery } from '@modules/notifications/domain/notification-delivery.entity';
import { NotificationAudience } from '@modules/notifications/domain/notification-audience.entity';
import { NotificationPreference } from '@modules/notifications/domain/notification-preference.entity';
import { NotificationRetentionPolicy } from '@modules/notifications/domain/notification-retention-policy.entity';
import { WebPushSubscription } from '@modules/notifications/domain/web-push-subscription.entity';
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
import { HrJornada1757170000000 } from '../migrations/1757170000000-HrJornada';
import { EmploymentContractsAndEmployeeShifts1757180000000 } from '../migrations/1757180000000-EmploymentContractsAndEmployeeShifts';
import { EmploymentContract } from '@modules/employees/domain/employment-contract.entity';
import { HrJobPosition } from '@modules/employees/domain/hr-job-position.entity';
import { HrEmployeeTimelineEntry } from '@modules/employees/domain/hr-employee-timeline-entry.entity';
import { HcmContractJobTimeline1757200000000 } from '../migrations/1757200000000-HcmContractJobTimeline';
import { HcmTipsAfpFunds1757210000000 } from '../migrations/1757210000000-HcmTipsAfpFunds';
import { HrLaborUnits1757220000000 } from '../migrations/1757220000000-HrLaborUnits';
import { HrLaborUnitAssociationsMn1757230000000 } from '../migrations/1757230000000-HrLaborUnitAssociationsMn';
import { HrEmployeeShift } from '@modules/hr-jornada/domain/hr-employee-shift.entity';
import { HrAfpFund } from '@modules/employees/domain/hr-afp-fund.entity';
import { HrIsapre } from '@modules/employees/domain/hr-isapre.entity';
import { HcmContractWeeklyHoursIsapre1757240000000 } from '../migrations/1757240000000-HcmContractWeeklyHoursIsapre';
import { FiscalDocumentFamilies1757250000000 } from '../migrations/1757250000000-FiscalDocumentFamilies';
import { HcmLaborUnitShifts1757250000000 } from '../migrations/1757250000000-HcmLaborUnitShifts';
import { HcmShiftSystems1757260000000 } from '../migrations/1757260000000-HcmShiftSystems';
import { HcmShiftInstanceLaborUnitShift1757270000000 } from '../migrations/1757270000000-HcmShiftInstanceLaborUnitShift';
import { HrLaborUnitShift } from '@modules/hr-jornada/domain/hr-labor-unit-shift.entity';
import { HrLaborUnitShiftMember } from '@modules/hr-jornada/domain/hr-labor-unit-shift-member.entity';
import { HrShiftSystem } from '@modules/hr-jornada/domain/hr-shift-system.entity';
import { HrLaborUnit } from '@modules/hr-labor-units/domain/hr-labor-unit.entity';
import { HrLaborUnitStorage } from '@modules/hr-labor-units/domain/hr-labor-unit-storage.entity';
import { HrLaborUnitBranch } from '@modules/hr-labor-units/domain/hr-labor-unit-branch.entity';
import { HrLaborUnitOrganizationalUnit } from '@modules/hr-labor-units/domain/hr-labor-unit-organizational-unit.entity';
import { HrLaborUnitProductionUnit } from '@modules/hr-labor-units/domain/hr-labor-unit-production-unit.entity';

/**
 * DataSource usado por `typeorm` CLI (`migration:run`, `schema:log`, …).
 * Migraciones explícitas en `src/migrations/`; en desarrollo también puede aplicarse DDL vía
 * `DB_SYNCHRONIZE=true` en Nest (`typeorm.config.ts`).
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  /** Postgres no usa "root"; alinear con .env.example / usuario local típico */
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'flow-store',
  /** Misma lógica que el API: solo genera DDL si el env lo pide */
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  entities: [
    PointOfSale,
    Branch,
    Company,
    PriceList,
      User,
      UserCompanyMembership,
      UserCompanyRole,
      UserCompanyPerson,
      Person,
    CashSession,
    Transaction,
    DocumentSequence,
    TransactionLine,
    Product,
    ProductVariant,
    ProductVariantProductionUnit,
    ProductVariantBranchAvailability,
    Customer,
    Tax,
    Unit,
    Category,
    Brand,
    ProductionUnit,
    DiningRoom,
    DiningTable,
    DiningOrder,
    DiningOrderLine,
    DiningBranchSettings,
    DiningOrderSequence,
    DiningKitchenFireSequence,
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
    CashHub,
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
    HrLaborUnit,
    HrLaborUnitStorage,
    HrLaborUnitBranch,
    HrLaborUnitOrganizationalUnit,
    HrLaborUnitProductionUnit,
    HrEmployeeTimelineEntry,
    HrEmployeeShift,
    HrLaborUnitShift,
    HrLaborUnitShiftMember,
    HrShiftSystem,
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
  ],
  subscribers: [AuditSubscriber, TenantSubscriber],
  migrations: [
    AddTaxNonDeletable1740000000000,
    CashHubsAndSessionToHub1741000000000,
    AddCashSessionToHubTransferAccountingRuleEnum1741100000000,
    MultiCompanyInit1742000000000,
    PosSettingsJson1743000000000,
    Checks1744000000000,
    Quotations1745000000000,
    EnsureDocumentSequences1746000000000,
    Promotions1748000000000,
    SuperAdminRoleAndUserNonDeletable1749000000000,
    ProductVariantUomTriplet1750000000000,
    ProductVariantCountStockBridge1751000000000,
    PointOfSaleStorage1752000000000,
    StockLevelThresholds1753000000000,
    ProductVariantShippingLogistics1753100000000,
    CompanyAddressMail1755000000000,
    BrandsAndProductBrandId1756000000000,
    BrandsIdDefaultGenRandomUuid1756010000000,
    ProductTypeManufacturadoElaboradoPreparado1756020000000,
    RemovePaymentOutTransactionTypes1756030000000,
    PersonDocumentTypeDni1756040000000,
    BackorderTransactionType1756050000000,
    AddCustomerCreditNoteAndOrderAdvancePaymentMethods1756060000000,
    SyncCommittedStockFromReservations1756070000000,
    UnitIsDefault1756080000000,
    NotificationsCore1756090000000,
    StockThresholdEnabledFlags1756100000000,
    CashHubCompanyCodeUnique1756110000000,
    CompanyPhone1756200000000,
    RemoveProductVariantLegacyWeight1756220000000,
    EShopModule1756300000000,
    EShopHeroSlides1756400000000,
    EShopHeroSlideCtaStyle1756410000000,
    MultimediaLinkAttributeId1756440000000,
    PriceListNonDeletable1756450000000,
    EShopDefaultStorageBackfill1756460000000,
    CompanyPublicContactBackfill1756470000000,
    CompanyIdentityBackfill1756480000000,
    CustomerCreditNotePayoutTransactionType1756490000000,
    OperationalExpenseDocumentKindAndPaymentStatus1756500000000,
    EShopFulfillmentMethods1756510000000,
    EShopCustomerAccounts1756520000000,
    EShopCustomerAccountUsername1756530000000,
    PaymentGatewayIntents1756540000000,
    PaymentGatewayIntentMpOrderIdIndex1756550000000,
    PresaleTickets1756560000000,
    FiscalCore1756570000000,
    CompanySiiEmisorFields1756580000000,
    FiscalDteEmissions1756590000000,
    PosFiscalAllocations1756600000000,
    FolioPackagesAndSubAllocations1756610000000,
    FiscalDteEmissionAsync1756700000000,
    PosSyncCommands1756710000000,
    PosSyncCashSessionId1756720000000,
    ProductVariantFiscalFields1756730000000,
    MultiSubPackPerPos1756740000000,
    EShopCarts1756750000000,
    EShopDeliveryCore1756760000000,
    CourierRole1756770000000,
    EShopCanonicalFulfillmentMethods1756780000000,
    EShopDeliveryPostgisGeometry1756790000000,
    EShopDeliveryOrderLinePicks1756800000000,
    EShopDeliveryOccurrenceKindAndEndTime1756810000000,
    RenameEShopDeliveryTablesToDelivery1756820000000,
    PersonDocumentTypeRunToRut1756900000000,
    PersonDocumentTypeDniToOther1756910000000,
    BackfillPaymentInBankAccountKey1756920000000,
    ProductionUnits1756930000000,
    Dining1756940000000,
    DiningOrderNumbering1756950000000,
    DiningOpenTablePolicy1756960000000,
    VariantProductionUnitRouting1756970000000,
    ProductionUnitScopeAndMode1756980000000,
    VariantBranchAvailability1756990000000,
    StorageProductionInputCategory1757000000000,
    StorageProductionInputsType1757010000000,
    StorageProductionInputsTypeBackfill1757020000000,
    UserCompanyMemberships1757100000000,
    ProductTypeInsumo1757110000000,
    RecipeCtpAndDiningMaterialReservation1757120000000,
    NotificationDomainCatalog1757130000000,
    DiningKitchenFireId1757140000000,
    DiningKitchenFireNumber1757150000000,
    ProductionUnitPurpose1757160000000,
    HrJornada1757170000000,
    EmploymentContractsAndEmployeeShifts1757180000000,
    HcmContractJobTimeline1757200000000,
    HcmTipsAfpFunds1757210000000,
    HrLaborUnits1757220000000,
    HrLaborUnitAssociationsMn1757230000000,
    HcmContractWeeklyHoursIsapre1757240000000,
    FiscalDocumentFamilies1757250000000,
    HcmLaborUnitShifts1757250000000,
    HcmShiftSystems1757260000000,
    HcmShiftInstanceLaborUnitShift1757270000000,
    RecurringOperationalExpenses1757280000000,
    DiningPosAccountsMenuCategories1757290000000,
    WebPushSubscriptions1757300000000,
  ],
  migrationsTableName: 'typeorm_migrations',
  logging: process.env.DB_LOGGING === 'true',
  extra: {
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
    enableKeepAlive: true,
    decimalNumbers: true,
  },
});
