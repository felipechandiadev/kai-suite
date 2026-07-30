import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { SupplierInvoicesController } from './presentation/supplier-invoices.controller';
import { SupplierInvoiceEnumBootstrap } from './application/supplier-invoice-enum.bootstrap';

@Module({
  imports: [CqrsModule, TransactionsModule],
  controllers: [SupplierInvoicesController],
  providers: [SupplierInvoiceEnumBootstrap],
})
export class SupplierInvoicesModule {}

