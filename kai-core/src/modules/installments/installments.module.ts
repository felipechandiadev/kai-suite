import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Installment } from '@modules/installments/domain/installment.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { InstallmentRepository } from '@modules/installments/infrastructure/installment.repository';
import { InstallmentService } from '@modules/installments/application/services/installment.service';
import { InstallmentController } from '@modules/installments/presentation/installment.controller';
import { AccountsReceivableController } from '@modules/installments/presentation/accounts-receivable.controller';
import { TransactionsModule } from '@modules/transactions/transactions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Installment, Transaction]),
    TransactionsModule,
    CqrsModule,
  ],
  controllers: [InstallmentController, AccountsReceivableController],
  providers: [InstallmentRepository, InstallmentService],
  exports: [InstallmentService, InstallmentRepository],
})
export class InstallmentsModule {}
