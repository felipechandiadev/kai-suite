import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { PaymentsController } from './presentation/payments.controller';
import { PaymentsService } from './application/payments.service';
import { PaymentsServiceAdapter } from './application/payments.service.adapter';
import { CreateMultiplePaymentsHandler } from './application/handlers/create-multiple-payments.handler';
import { TypeOrmPaymentsRepository } from './infrastructure/repositories/typeorm-payments.repository';
import { PAYMENTS_REPOSITORY } from './application/ports/payments.repository.port';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { CashSession } from '@modules/cash-sessions/domain/cash-session.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { User } from '@modules/users/domain/user.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { LedgerEntriesModule } from '@modules/ledger-entries/ledger-entries.module';
import { InstallmentsModule } from '@modules/installments/installments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transaction,
      CashSession,
      PointOfSale,
      User,
      Branch,
    ]),
    CqrsModule,
    TransactionsModule,
    LedgerEntriesModule,
    InstallmentsModule,
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentsServiceAdapter,
    CreateMultiplePaymentsHandler,
    { provide: PAYMENTS_REPOSITORY, useClass: TypeOrmPaymentsRepository },
  ],
  exports: [PaymentsServiceAdapter],
})
export class PaymentsModule {}
