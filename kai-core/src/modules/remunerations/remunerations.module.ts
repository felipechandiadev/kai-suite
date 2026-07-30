import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { RemunerationsService } from './application/remunerations.service';
import { RemunerationsController } from './presentation/remunerations.controller';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { Employee } from '@modules/employees/domain/employee.entity';
import { EmployeesModule } from '@modules/employees/employees.module';
import { ResultCenter } from '@modules/result-centers/domain/result-center.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { User } from '@modules/users/domain/user.entity';
import { Remuneration } from './domain/remuneration.entity';
import { PayrollLineSuggestion } from './domain/payroll-line-suggestion.entity';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { TypeOrmRemunerationRepository } from './infrastructure/repositories/typeorm-remuneration.repository';
import {
  OvertimeGeneratedHandler,
  ShiftExceptionSettledHandler,
} from './application/handlers/hr-jornada-payroll.handlers';
import { PayrollStatutoryCalculator } from './application/payroll-statutory.calculator';
import { PayrollAutoExpenseService } from './application/payroll-auto-expense.service';
import { OperationalExpensesModule } from '@modules/operational-expenses/operational-expenses.module';
import { Supplier } from '@modules/suppliers/domain/supplier.entity';
import { Person } from '@modules/persons/domain/person.entity';
import { ExpenseCategory } from '@modules/expense-categories/domain/expense-category.entity';

@Module({
  imports: [
    CqrsModule,
    forwardRef(() => EmployeesModule),
    TypeOrmModule.forFeature([
      Transaction,
      Employee,
      ResultCenter,
      Branch,
      User,
      Remuneration,
      PayrollLineSuggestion,
      Supplier,
      Person,
      ExpenseCategory,
    ]),
    TransactionsModule,
    OperationalExpensesModule,
  ],
  controllers: [RemunerationsController],
  providers: [
    RemunerationsService,
    PayrollStatutoryCalculator,
    PayrollAutoExpenseService,
    {
      provide: 'RemunerationRepositoryPort',
      useClass: TypeOrmRemunerationRepository,
    },
    ShiftExceptionSettledHandler,
    OvertimeGeneratedHandler,
  ],
  exports: [RemunerationsService],
})
export class RemunerationsModule {}
