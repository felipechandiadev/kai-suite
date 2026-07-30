import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { AccountBalanceService } from './application/account-balance.service';
import { AccountBalancesServiceAdapter } from './application/services/account-balances.service.adapter';
import { AccountBalance } from './domain/account-balance.entity';
import { LedgerEntry } from '@modules/ledger-entries/domain/ledger-entry.entity';
import { AccountingPeriod } from '@modules/accounting-periods/domain/accounting-period.entity';
import { UpdateBalancesForLedgerEntriesHandler } from './application/command-handlers/update-balances-for-ledger-entries.handler';
import { FreezeBalancesForPeriodHandler } from './application/command-handlers/freeze-balances-for-period.handler';
import { GetBalancesForPeriodHandler } from './application/query-handlers/get-balances-for-period.handler';
import { TypeOrmAccountBalanceRepository } from './infrastructure/repositories/typeorm-account-balance.repository';
import { AccountBalancesController } from './presentation/account-balances.controller';

/**
 * PHASE 2: Account Balances Module
 *
 * Provides high-performance balance management through pre-calculated aggregations.
 * Critical for scalability when transaction volumes exceed 100K records.
 */
@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([AccountBalance, LedgerEntry, AccountingPeriod]),
  ],
  controllers: [AccountBalancesController],
  providers: [
    AccountBalanceService,
    AccountBalancesServiceAdapter,
    {
      provide: 'AccountBalanceRepositoryPort',
      useClass: TypeOrmAccountBalanceRepository,
    },
    UpdateBalancesForLedgerEntriesHandler,
    FreezeBalancesForPeriodHandler,
    GetBalancesForPeriodHandler,
  ],
  exports: [AccountBalanceService, AccountBalancesServiceAdapter],
})
export class AccountBalancesModule {}
