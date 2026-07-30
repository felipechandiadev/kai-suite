import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { SupplierHonorariumReceiptsController } from './presentation/supplier-honorarium-receipts.controller';

@Module({
  imports: [CqrsModule, TransactionsModule],
  controllers: [SupplierHonorariumReceiptsController],
})
export class SupplierHonorariumReceiptsModule {}
