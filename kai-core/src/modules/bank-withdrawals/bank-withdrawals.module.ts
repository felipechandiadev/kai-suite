import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { User } from '@modules/users/domain/user.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { BankWithdrawal } from './domain/bank-withdrawal.entity';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { BankWithdrawalsService } from './application/bank-withdrawals.service';
import { BankWithdrawalsController } from './presentation/bank-withdrawals.controller';
import { TypeOrmBankWithdrawalRepository } from './infrastructure/repositories/typeorm-bank-withdrawal.repository';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([Transaction, User, Branch, BankWithdrawal]),
    TransactionsModule,
  ],
  controllers: [BankWithdrawalsController],
  providers: [
    BankWithdrawalsService,
    {
      provide: 'BankWithdrawalRepositoryPort',
      useClass: TypeOrmBankWithdrawalRepository,
    },
  ],
  exports: [BankWithdrawalsService],
})
export class BankWithdrawalsModule {}
