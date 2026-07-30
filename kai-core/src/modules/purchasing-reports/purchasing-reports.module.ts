import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { Supplier } from '@modules/suppliers/domain/supplier.entity';
import { PurchasingReportsController } from './presentation/purchasing-reports.controller';
import { PurchasingReportRunner } from './application/purchasing-report.runner';
import { PurchasingReportsQueryService } from './application/purchasing-reports-query.service';
import {
  PurchaseDetailHandler,
  PurchasesByPaymentMethodHandler,
  PurchasesByPeriodHandler,
  PurchasesByProductHandler,
  PurchasesBySupplierHandler,
  SupplierReturnsHandler,
} from './application/handlers/mvp.handlers';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, TransactionLine, Supplier])],
  controllers: [PurchasingReportsController],
  providers: [
    PurchasingReportsQueryService,
    PurchasingReportRunner,
    PurchasesByPeriodHandler,
    PurchaseDetailHandler,
    PurchasesByProductHandler,
    SupplierReturnsHandler,
    PurchasesBySupplierHandler,
    PurchasesByPaymentMethodHandler,
  ],
  exports: [PurchasingReportRunner],
})
export class PurchasingReportsModule {}
