/**
 * TypeORM entities registered when KAI_EDITION=lite.
 * Subset oriented to KaiStore Lite (POS + Admin + inventory); excludes Food/HCM/e-shop/dining/fiscal SII.
 */
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
import { Employee } from '@modules/employees/domain/employee.entity';
import { CashSession } from '@modules/cash-sessions/domain/cash-session.entity';
import { CashHub } from '@modules/cash-hubs/domain/cash-hub.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { DocumentSequence } from '@modules/transactions/domain/document-sequence.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { Product } from '@modules/products/domain/product.entity';
import { ProductAddon } from '@modules/products/domain/product-addon.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { ProductVariantBranchAvailability } from '@modules/product-variants/domain/product-variant-branch-availability.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import { Tax } from '@modules/taxes/domain/tax.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { Category } from '@modules/categories/domain/category.entity';
import { Brand } from '@modules/brands/domain/brand.entity';
import { Supplier } from '@modules/suppliers/domain/supplier.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { Attribute } from '@modules/attributes/domain/attribute.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import { Audit } from '@modules/audits/domain/audit.entity';
import { Permission } from '@modules/permissions/domain/permission.enum';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { Reception } from '@modules/receptions/domain/reception.entity';
import { ReceptionLine } from '@modules/receptions/domain/reception-line.entity';
import { MultimediaAsset } from '@modules/multimedia/domain/multimedia-asset.entity';
import { MultimediaLink } from '@modules/multimedia/domain/multimedia-link.entity';
import { MultimediaVariant } from '@modules/multimedia/domain/multimedia-variant.entity';
import { Promotion } from '@modules/promotions/domain/promotion.entity';
import { PromotionScopeBranch } from '@modules/promotions/domain/promotion-scope-branch.entity';
import { PromotionScopePos } from '@modules/promotions/domain/promotion-scope-pos.entity';
import { PromotionScopeProduct } from '@modules/promotions/domain/promotion-scope-product.entity';
import { PromotionScopeVariant } from '@modules/promotions/domain/promotion-scope-variant.entity';
import { PromotionScopeCategory } from '@modules/promotions/domain/promotion-scope-category.entity';
import { PromotionScopeCustomer } from '@modules/promotions/domain/promotion-scope-customer.entity';
import { PromotionScopePaymentMethod } from '@modules/promotions/domain/promotion-scope-payment-method.entity';
import { PromotionRedemption } from '@modules/promotions/domain/promotion-redemption.entity';
import { HealthMetric } from '@modules/health/domain/health-metric.entity';
import { ProductionUnit } from '@modules/production-units/domain/production-unit.entity';
import { ProductionUnitEmployee } from '@modules/production-units/domain/production-unit-employee.entity';
import { ResultCenter } from '@modules/result-centers/domain/result-center.entity';
import { OrganizationalUnit } from '@modules/organizational-units/domain/organizational-unit.entity';
import { Shareholder } from '@modules/shareholders/domain/shareholder.entity';
import { ExpenseCategory } from '@modules/expense-categories/domain/expense-category.entity';
import { AccountingPeriod } from '@modules/accounting-periods/domain/accounting-period.entity';
import { Installment } from '@modules/installments/domain/installment.entity';
import { Recipe } from '@modules/recipes/domain/recipe.entity';
import { RecipeLine } from '@modules/recipes/domain/recipe-line.entity';

export const LITE_ENTITIES = [
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
  Employee,
  CashSession,
  CashHub,
  Transaction,
  DocumentSequence,
  TransactionLine,
  Product,
  ProductAddon,
  ProductVariant,
  ProductVariantBranchAvailability,
  Customer,
  Tax,
  Unit,
  Category,
  Brand,
  Supplier,
  Storage,
  Attribute,
  PriceListItem,
  Audit,
  Permission,
  StockLevel,
  Reception,
  ReceptionLine,
  MultimediaAsset,
  MultimediaLink,
  MultimediaVariant,
  Promotion,
  PromotionScopeBranch,
  PromotionScopePos,
  PromotionScopeProduct,
  PromotionScopeVariant,
  PromotionScopeCategory,
  PromotionScopeCustomer,
  PromotionScopePaymentMethod,
  PromotionRedemption,
  HealthMetric,
  ProductionUnit,
  ProductionUnitEmployee,
  ResultCenter,
  OrganizationalUnit,
  Shareholder,
  ExpenseCategory,
  AccountingPeriod,
  Installment,
  Recipe,
  RecipeLine,
];
