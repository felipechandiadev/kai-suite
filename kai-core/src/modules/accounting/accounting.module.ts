import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountingController } from './presentation/accounting.controller';
import { AccountingService } from './application/accounting.service';
import { AccountingServiceAdapter } from './application/accounting.service.adapter';
import { GetAccountHierarchyQueryHandler } from './application/handlers/queries/get-account-hierarchy.query';
import { GetLedgerDataQueryHandler } from './application/handlers/queries/get-ledger-data.query';
import { BuildLedgerCommandHandler } from './application/handlers/commands/build-ledger.command';
import { AccountingAccount } from '@modules/accounting-accounts/domain/accounting-account.entity';
import { LedgerEntry } from '@modules/ledger-entries/domain/ledger-entry.entity';
import { TypeOrmAccountingRepository } from './infrastructure/repositories/typeorm-accounting.repository';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([AccountingAccount, LedgerEntry]),
  ],
  controllers: [AccountingController],
  providers: [
    AccountingService,
    AccountingServiceAdapter,
    GetAccountHierarchyQueryHandler,
    GetLedgerDataQueryHandler,
    BuildLedgerCommandHandler,
    {
      provide: 'AccountingRepositoryPort',
      useClass: TypeOrmAccountingRepository,
    },
  ],
  exports: [AccountingService, AccountingServiceAdapter],
})
export class AccountingModule {}
