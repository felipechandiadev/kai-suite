import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Budget } from './domain/budget.entity';
import { BudgetsController } from './presentation/budgets.controller';
import { BudgetsServiceAdapter } from './application/budgets.service.adapter';
import { GetAllBudgetsQueryHandler } from './application/handlers/queries/get-all-budgets.handler';
import { GetBudgetQueryHandler } from './application/handlers/queries/get-budget.handler';
import { TypeOrmBudgetRepository } from './infrastructure/repositories/type-orm-budget.repository';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([Budget]),
  ],
  controllers: [BudgetsController],
  providers: [
    BudgetsServiceAdapter,
    GetAllBudgetsQueryHandler,
    GetBudgetQueryHandler,
    {
      provide: 'BudgetRepositoryPort',
      useClass: TypeOrmBudgetRepository,
    },
  ],
  exports: [BudgetsServiceAdapter],
})
export class BudgetsModule {}
