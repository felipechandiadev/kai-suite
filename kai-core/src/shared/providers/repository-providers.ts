/**
 * GLOBAL REPOSITORY PROVIDERS MODULE
 *
 * Solves the NestJS TypeORM DI Pattern Mismatch:
 * - Services use @InjectRepository(DomainEntity)
 * - Modules register TypeOrmModule.forFeature([OrmEntity])
 * - NestJS cannot map domain token to ORM repository
 *
 * SOLUTION: This module exports providers that map domain entity tokens
 * to actual ORM repository instances at runtime.
 */

import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

// ============================================================================
// ORM ENTITY IMPORTS (Infrastructure Layer)
// ============================================================================

import { AccountingAccountOrmEntity } from '@modules/accounting-accounts/infrastructure/orm-mappers/accounting-account.orm-entity';
import { AccountingPeriodOrmEntity } from '@modules/accounting-periods/infrastructure/orm-mappers/accounting-period.orm-entity';
import { AccountingRuleOrmEntity } from '@modules/accounting-rules/infrastructure/orm-mappers/accounting-rule.orm-entity';
import { AuditOrmEntity } from '@modules/audits/infrastructure/orm-mappers/audit.orm-entity';
import { AttributeOrmEntity } from '@modules/attributes/infrastructure/orm-mappers/attribute.orm-entity';
import { BranchOrmEntity } from '@modules/branches/infrastructure/orm-mappers/branch.orm-entity';
import { CashSessionOrmEntity } from '@modules/cash-sessions/infrastructure/orm-mappers/cash-session.orm-entity';
import { CategoryOrmEntity } from '@modules/categories/infrastructure/orm-mappers/category.orm-entity';
import { CompanyOrmEntity } from '@modules/companies/infrastructure/orm-mappers/company.orm-entity';
import { CustomerOrmEntity } from '@modules/customers/infrastructure/orm-mappers/customer.orm-entity';
import { EmployeeOrmEntity } from '@modules/employees/infrastructure/orm-mappers/employee.orm-entity';
import { ExpenseCategoryOrmEntity } from '@modules/expense-categories/infrastructure/orm-mappers/expense-category.orm-entity';
import { MetalPriceOrmEntity } from '@modules/metal-prices/infrastructure/orm-mappers/metal-price.orm-entity';
import { LedgerEntryOrmEntity } from '@modules/ledger-entries/infrastructure/orm-mappers/ledger-entry.orm-entity';
import { OperationalExpenseOrmEntity } from '@modules/operational-expenses/infrastructure/orm-mappers/operational-expense.orm-entity';
import { OrganizationalUnitOrmEntity } from '@modules/organizational-units/infrastructure/orm-mappers/organizational-unit.orm-entity';
import { PersonOrmEntity } from '@modules/persons/infrastructure/orm-mappers/person.orm-entity';
import { PointOfSaleOrmEntity } from '@modules/points-of-sale/infrastructure/orm-mappers/point-of-sale.orm-entity';
import { PriceListOrmEntity } from '@modules/price-lists/infrastructure/orm-mappers/price-list.orm-entity';
import { ReceptionOrmEntity } from '@modules/receptions/infrastructure/orm-mappers/reception.orm-entity';
import { ReceptionLineOrmEntity } from '@modules/receptions/infrastructure/orm-mappers/reception-line.orm-entity';
import { ResultCenterOrmEntity } from '@modules/result-centers/infrastructure/orm-mappers/result-center.orm-entity';
import { ShareholderOrmEntity } from '@modules/shareholders/infrastructure/orm-mappers/shareholder.orm-entity';
import { StockLevelOrmEntity } from '@modules/stock-levels/infrastructure/orm-mappers/stock-level.orm-entity';
import { StorageOrmEntity } from '@modules/storages/infrastructure/orm-mappers/storage.orm-entity';
import { SupplierOrmEntity } from '@modules/suppliers/infrastructure/orm-mappers/supplier.orm-entity';
import { TaxOrmEntity } from '@modules/taxes/infrastructure/orm-mappers/tax.orm-entity';
import { TransactionOrmEntity } from '@modules/transactions/infrastructure/orm-mappers/transaction.orm-entity';
import { TransactionLineOrmEntity } from '@modules/transaction-lines/infrastructure/orm-mappers/transaction-line.orm-entity';
import { TreasuryAccountOrmEntity } from '@modules/treasury-accounts/infrastructure/orm-mappers/treasury-account.orm-entity';
import { UnitOrmEntity } from '@modules/units/infrastructure/orm-mappers/unit.orm-entity';
import { UserOrmEntity } from '@modules/users/infrastructure/orm-mappers/user.orm-entity';

// ============================================================================
// DOMAIN ENTITY IMPORTS (Domain Layer)
// ============================================================================

import { AccountingAccount } from '@modules/accounting-accounts/domain/accounting-account.entity';
import { AccountingPeriod } from '@modules/accounting-periods/domain/accounting-period.entity';
import { AccountingRule } from '@modules/accounting-rules/domain/accounting-rule.entity';
import { Audit } from '@modules/audits/domain/audit.entity';
import { Attribute } from '@modules/attributes/domain/attribute.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { CashSession } from '@modules/cash-sessions/domain/cash-session.entity';
import { Category } from '@modules/categories/domain/category.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import { Employee } from '@modules/employees/domain/employee.entity';
import { ExpenseCategory } from '@modules/expense-categories/domain/expense-category.entity';
import { MetalPrice } from '@modules/metal-prices/domain/metal-price.entity';
import { LedgerEntry } from '@modules/ledger-entries/domain/ledger-entry.entity';
import { OperationalExpense } from '@modules/operational-expenses/domain/operational-expense.entity';
import { OrganizationalUnit } from '@modules/organizational-units/domain/organizational-unit.entity';
import { Person } from '@modules/persons/domain/person.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { PriceList } from '@modules/price-lists/domain/price-list.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import { Product } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Reception } from '@modules/receptions/domain/reception.entity';
import { ReceptionLine } from '@modules/receptions/domain/reception-line.entity';
import { ResultCenter } from '@modules/result-centers/domain/result-center.entity';
import { Shareholder } from '@modules/shareholders/domain/shareholder.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { Supplier } from '@modules/suppliers/domain/supplier.entity';
import { Tax } from '@modules/taxes/domain/tax.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { TreasuryAccount } from '@modules/treasury-accounts/domain/treasury-account.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { User } from '@modules/users/domain/user.entity';

// ============================================================================
// PROVIDER FACTORY
// ============================================================================

/**
 * Factory function to create a repository provider that maps a domain entity
 * token to the actual ORM entity repository
 */
export function createRepositoryProvider(domainEntity: any, ormEntity: any) {
  return {
    provide: getRepositoryToken(domainEntity),
    useFactory: (dataSource: DataSource) => dataSource.getRepository(ormEntity),
    inject: [DataSource],
  };
}

// ============================================================================
// ALL REPOSITORY PROVIDERS (35 ENTITIES)
// ============================================================================

export const REPOSITORY_PROVIDERS = [
  // Accounting Domain
  createRepositoryProvider(AccountingAccount, AccountingAccountOrmEntity),
  createRepositoryProvider(AccountingPeriod, AccountingPeriodOrmEntity),
  createRepositoryProvider(AccountingRule, AccountingRuleOrmEntity),

  // Audit Domain
  createRepositoryProvider(Audit, AuditOrmEntity),

  // Catalog Domain
  createRepositoryProvider(Attribute, AttributeOrmEntity),
  createRepositoryProvider(Category, CategoryOrmEntity),
  createRepositoryProvider(Product, Product),
  createRepositoryProvider(ProductVariant, ProductVariant),

  // Company Domain
  createRepositoryProvider(Branch, BranchOrmEntity),
  createRepositoryProvider(Company, CompanyOrmEntity),
  createRepositoryProvider(OrganizationalUnit, OrganizationalUnitOrmEntity),
  createRepositoryProvider(Shareholder, ShareholderOrmEntity),

  // Pricing Domain
  createRepositoryProvider(MetalPrice, MetalPriceOrmEntity),
  createRepositoryProvider(PriceList, PriceListOrmEntity),
  createRepositoryProvider(PriceListItem, PriceListItem),
  createRepositoryProvider(Tax, TaxOrmEntity),

  // People Domain
  createRepositoryProvider(Customer, CustomerOrmEntity),
  createRepositoryProvider(Employee, EmployeeOrmEntity),
  createRepositoryProvider(Person, PersonOrmEntity),
  createRepositoryProvider(User, UserOrmEntity),

  // Point of Sale Domain
  createRepositoryProvider(CashSession, CashSessionOrmEntity),
  createRepositoryProvider(PointOfSale, PointOfSaleOrmEntity),

  // Inventory Domain
  createRepositoryProvider(Storage, StorageOrmEntity),
  createRepositoryProvider(StockLevel, StockLevelOrmEntity),
  createRepositoryProvider(Unit, UnitOrmEntity),

  // Supplier Domain
  createRepositoryProvider(Supplier, SupplierOrmEntity),

  // Reception Domain
  createRepositoryProvider(Reception, ReceptionOrmEntity),
  createRepositoryProvider(ReceptionLine, ReceptionLineOrmEntity),

  // Transactions & Accounting Domain
  createRepositoryProvider(Transaction, TransactionOrmEntity),
  createRepositoryProvider(TransactionLine, TransactionLineOrmEntity),
  createRepositoryProvider(LedgerEntry, LedgerEntryOrmEntity),
  createRepositoryProvider(TreasuryAccount, TreasuryAccountOrmEntity),

  // Expenses Domain
  createRepositoryProvider(ExpenseCategory, ExpenseCategoryOrmEntity),
  createRepositoryProvider(OperationalExpense, OperationalExpenseOrmEntity),
  createRepositoryProvider(ResultCenter, ResultCenterOrmEntity),
];
