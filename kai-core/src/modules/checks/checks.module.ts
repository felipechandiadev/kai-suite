import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { BankMovement } from '@modules/bank-movements/domain/bank-movement.entity';
import { LedgerEntry } from '@modules/ledger-entries/domain/ledger-entry.entity';
import { AccountingAccount } from '@modules/accounting-accounts/domain/accounting-account.entity';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { Check } from './domain/check.entity';
import { CheckTransactionLink } from './domain/check-transaction-link.entity';
import { CheckEvent } from './domain/check-event.entity';
import { ChecksService } from './application/checks.service';
import { ChecksReconciliationService } from './application/checks-reconciliation.service';
import { ChecksController } from './presentation/checks.controller';
import { TypeOrmCheckRepository } from './infrastructure/repositories/typeorm-check.repository';
import { CheckFromTransactionHandler } from './application/handlers/check-from-transaction.handler';
import { CheckLedgerService } from './application/check-ledger.service';
import { CheckBankCartolaService } from './application/check-bank-cartola.service';
import { CheckPaymentObligationService } from './application/check-payment-obligation.service';

@Module({
  imports: [
    CqrsModule,
    forwardRef(() => TransactionsModule),
    TypeOrmModule.forFeature([
      Check,
      CheckTransactionLink,
      CheckEvent,
      Transaction,
      BankMovement,
      LedgerEntry,
      AccountingAccount,
    ]),
  ],
  controllers: [ChecksController],
  providers: [
    ChecksService,
    ChecksReconciliationService,
    CheckLedgerService,
    CheckBankCartolaService,
    CheckPaymentObligationService,
    CheckFromTransactionHandler,
    {
      provide: 'CheckRepositoryPort',
      useClass: TypeOrmCheckRepository,
    },
  ],
  exports: [ChecksService, ChecksReconciliationService],
})
export class ChecksModule {}
