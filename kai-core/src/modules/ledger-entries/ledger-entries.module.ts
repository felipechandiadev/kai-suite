import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerEntry } from '@modules/ledger-entries/domain/ledger-entry.entity';
import { LedgerEntriesService } from './application/ledger-entries.service';
import { LedgerEntriesServiceAdapter } from '@modules/ledger-entries/application/ledger-entries.service.adapter';
import { LedgerEntriesController } from '@modules/ledger-entries/presentation/ledger-entries.controller';
import { GetLedgerEntriesQueryHandler } from './application/queries/get-ledger-entries.query';
import { GetAccountBalanceQueryHandler } from './application/queries/get-account-balance.query';
import { GetPersonBalanceQueryHandler } from './application/queries/get-person-balance.query';
import { GenerateLedgerEntriesCommandHandler } from './application/commands/generate-ledger-entries.command';
import { AccountingRule } from '@modules/accounting-rules/domain/accounting-rule.entity';
import { AccountingAccount } from '@modules/accounting-accounts/domain/accounting-account.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import { Supplier } from '@modules/suppliers/domain/supplier.entity';
import { Shareholder } from '@modules/shareholders/domain/shareholder.entity';
import { Employee } from '@modules/employees/domain/employee.entity';
import { TypeOrmLedgerEntryRepository } from './infrastructure/repositories/typeorm-ledger-entry.repository';
import { TypeOrmAccountingRuleRepository } from './infrastructure/repositories/typeorm-accounting-rule.repository';
import { TypeOrmAccountingAccountRepository } from './infrastructure/repositories/typeorm-accounting-account.repository';
import { TypeOrmCustomerRepository } from './infrastructure/repositories/typeorm-customer.repository';
import { TypeOrmSupplierRepository } from './infrastructure/repositories/typeorm-supplier.repository';
import { TypeOrmShareholderRepository } from './infrastructure/repositories/typeorm-shareholder.repository';
import { TypeOrmEmployeeRepository } from './infrastructure/repositories/typeorm-employee.repository';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([
      LedgerEntry,
      AccountingRule,
      AccountingAccount,
      Customer,
      Supplier,
      Shareholder,
      Employee,
    ]),
  ],
  controllers: [LedgerEntriesController],
  providers: [
    LedgerEntriesService,
    LedgerEntriesServiceAdapter,
    GetLedgerEntriesQueryHandler,
    GetAccountBalanceQueryHandler,
    GetPersonBalanceQueryHandler,
    GenerateLedgerEntriesCommandHandler,
    // Repository implementations
    TypeOrmLedgerEntryRepository,
    TypeOrmAccountingRuleRepository,
    TypeOrmAccountingAccountRepository,
    TypeOrmCustomerRepository,
    TypeOrmSupplierRepository,
    TypeOrmShareholderRepository,
    TypeOrmEmployeeRepository,
    // Repository port tokens
    {
      provide: 'LedgerEntryRepositoryPort',
      useClass: TypeOrmLedgerEntryRepository,
    },
    {
      provide: 'AccountingRuleRepositoryPort',
      useClass: TypeOrmAccountingRuleRepository,
    },
    {
      provide: 'AccountingAccountRepositoryPort',
      useClass: TypeOrmAccountingAccountRepository,
    },
    {
      provide: 'CustomerRepositoryPort',
      useClass: TypeOrmCustomerRepository,
    },
    {
      provide: 'SupplierRepositoryPort',
      useClass: TypeOrmSupplierRepository,
    },
    {
      provide: 'ShareholderRepositoryPort',
      useClass: TypeOrmShareholderRepository,
    },
    {
      provide: 'EmployeeRepositoryPort',
      useClass: TypeOrmEmployeeRepository,
    },
  ],
  exports: [LedgerEntriesService, LedgerEntriesServiceAdapter],
})
export class LedgerEntriesModule {}
