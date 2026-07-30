import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { SupplierGuidesController } from './presentation/supplier-guides.controller';

@Module({
  imports: [CqrsModule, TransactionsModule],
  controllers: [SupplierGuidesController],
})
export class SupplierGuidesModule {}
