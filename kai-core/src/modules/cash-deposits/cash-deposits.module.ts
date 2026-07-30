import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { User } from '@modules/users/domain/user.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { CashDeposit } from './domain/cash-deposit.entity';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { CashDepositsService } from './application/cash-deposits.service';
import { CashDepositsController } from './presentation/cash-deposits.controller';
import { TypeOrmCashDepositRepository } from './infrastructure/repositories/typeorm-cash-deposit.repository';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([Transaction, User, Branch, CashDeposit]),
    TransactionsModule,
  ],
  controllers: [CashDepositsController],
  providers: [
    CashDepositsService,
    {
      provide: 'CashDepositRepositoryPort',
      useClass: TypeOrmCashDepositRepository,
    },
  ],
  exports: [CashDepositsService],
})
export class CashDepositsModule {}
