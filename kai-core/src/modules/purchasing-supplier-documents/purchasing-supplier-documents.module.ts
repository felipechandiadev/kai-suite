import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { SupplierCreditNotesController } from './presentation/supplier-credit-notes.controller';
import { PurchaseReturnsController } from './presentation/purchase-returns.controller';

@Module({
  imports: [CqrsModule, TransactionsModule],
  controllers: [SupplierCreditNotesController, PurchaseReturnsController],
})
export class PurchasingSupplierDocumentsModule {}
