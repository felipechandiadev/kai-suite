import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { User } from '@modules/users/domain/user.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { BankTransfer } from './domain/bank-transfer.entity';
import { CashHub } from '@modules/cash-hubs/domain/cash-hub.entity';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { BankTransfersService } from './application/bank-transfers.service';
import { BankTransfersController } from './presentation/bank-transfers.controller';
import { TypeOrmBankTransferRepository } from './infrastructure/repositories/typeorm-bank-transfer.repository';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([Transaction, User, Branch, BankTransfer, CashHub]),
    TransactionsModule,
  ],
  controllers: [BankTransfersController],
  providers: [
    BankTransfersService,
    {
      provide: 'BankTransferRepositoryPort',
      useClass: TypeOrmBankTransferRepository,
    },
  ],
  exports: [BankTransfersService],
})
export class BankTransfersModule {}
