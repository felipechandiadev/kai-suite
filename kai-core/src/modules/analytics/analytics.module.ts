import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './presentation/analytics.controller';
import { AnalyticsService } from './application/analytics.service';
import { AnalyticsServiceAdapter } from './application/analytics.service.adapter';
import { TypeOrmAnalyticsRepository } from './infrastructure/repositories/typeorm-analytics.repository';
import { Customer } from '@modules/customers/domain/customer.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { CashSession } from '@modules/cash-sessions/domain/cash-session.entity';
import { Employee } from '@modules/employees/domain/employee.entity';
import { OperationalExpense } from '@modules/operational-expenses/domain/operational-expense.entity';
import { Installment } from '@modules/installments/domain/installment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      Transaction,
      StockLevel,
      CashSession,
      Employee,
      OperationalExpense,
      Installment,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    AnalyticsServiceAdapter,
    {
      provide: 'AnalyticsRepositoryPort',
      useClass: TypeOrmAnalyticsRepository,
    },
  ],
  exports: [AnalyticsService, AnalyticsServiceAdapter],
})
export class AnalyticsModule {}
