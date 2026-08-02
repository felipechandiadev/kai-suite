import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from '@modules/branches/domain/branch.entity';
import { CompaniesModule } from '@modules/companies/companies.module';
import { DiningOrder } from '@modules/dining/domain/dining-order.entity';
import { Employee } from '@modules/employees/domain/employee.entity';
import { EmploymentContract } from '@modules/employees/domain/employment-contract.entity';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { User } from '@modules/users/domain/user.entity';
import { UserCompanyPerson } from '@modules/users/domain/user-company-person.entity';
import { TipLedgerEntry } from './domain/tip-ledger-entry.entity';
import { TipsService } from './application/tips.service';
import { TipsPayoutService } from './application/tips-payout.service';
import { TipsDueWorkerService } from './application/tips-due.worker.service';
import { TipsSchemaBootstrap } from './application/tips-schema.bootstrap';
import { TipsController } from './presentation/tips.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TipLedgerEntry,
      DiningOrder,
      User,
      UserCompanyPerson,
      Employee,
      EmploymentContract,
      Branch,
    ]),
    CompaniesModule,
    forwardRef(() => TransactionsModule),
  ],
  controllers: [TipsController],
  providers: [
    TipsSchemaBootstrap,
    TipsService,
    TipsPayoutService,
    TipsDueWorkerService,
  ],
  exports: [TipsService, TipsPayoutService],
})
export class TipsModule {}
