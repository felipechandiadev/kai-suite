import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { OperationalExpense } from './domain/operational-expense.entity';
import { RecurringOperationalExpense } from './domain/recurring-operational-expense.entity';
import { RecurringOperationalExpenseRun } from './domain/recurring-operational-expense-run.entity';
import { OperationalExpensesService } from './application/operational-expenses.service';
import { RecurringOperationalExpensesService } from './application/recurring-operational-expenses.service';
import { RecurringOperationalExpenseWorkerService } from './application/recurring-operational-expense-worker.service';
import { OperationalExpensesController } from './presentation/operational-expenses.controller';
import { RecurringOperationalExpensesController } from './presentation/recurring-operational-expenses.controller';
import { OperationalExpensesRepository } from './infrastructure/operational-expenses.repository';
import { MultimediaModule } from '@modules/multimedia/multimedia.module';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OperationalExpense,
      RecurringOperationalExpense,
      RecurringOperationalExpenseRun,
      Branch,
      Transaction,
    ]),
    CqrsModule,
    MultimediaModule,
    TransactionsModule,
  ],
  controllers: [
    OperationalExpensesController,
    RecurringOperationalExpensesController,
  ],
  providers: [
    OperationalExpensesService,
    OperationalExpensesRepository,
    RecurringOperationalExpensesService,
    RecurringOperationalExpenseWorkerService,
  ],
  exports: [OperationalExpensesService, RecurringOperationalExpensesService],
})
export class OperationalExpensesModule {}
