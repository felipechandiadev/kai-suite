import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { CompaniesModule } from '@modules/companies/companies.module';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { QuotationsService } from './application/quotations.service';
import { ConvertQuotationUseCase } from './application/commands/convert-quotation.usecase';
import { QuotationsEnumBootstrap } from './application/quotations-enum.bootstrap';
import { QuotationsController } from './presentation/quotations.controller';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([Transaction, TransactionLine, Branch]),
    CompaniesModule,
    TransactionsModule,
  ],
  controllers: [QuotationsController],
  providers: [QuotationsEnumBootstrap, QuotationsService, ConvertQuotationUseCase],
  exports: [QuotationsService, ConvertQuotationUseCase],
})
export class QuotationsModule {}
