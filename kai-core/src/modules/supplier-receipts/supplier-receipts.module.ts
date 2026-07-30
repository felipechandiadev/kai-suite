import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { SupplierReceiptsController } from './presentation/supplier-receipts.controller';

@Module({
  imports: [CqrsModule, TransactionsModule],
  controllers: [SupplierReceiptsController],
})
export class SupplierReceiptsModule {}
