import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { InventoryReportsController } from './presentation/inventory-reports.controller';
import { InventoryReportRunner } from './application/inventory-report.runner';
import { InventoryReportsQueryService } from './application/inventory-reports-query.service';
import {
  InventoryAdjustmentsHandler,
  InventoryTransfersHandler,
  StockAlertsHandler,
  StockByStorageHandler,
  StockValuationHandler,
} from './application/handlers/mvp.handlers';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StockLevel,
      ProductVariant,
      Transaction,
      TransactionLine,
      Storage,
    ]),
  ],
  controllers: [InventoryReportsController],
  providers: [
    InventoryReportsQueryService,
    InventoryReportRunner,
    StockValuationHandler,
    StockAlertsHandler,
    StockByStorageHandler,
    InventoryTransfersHandler,
    InventoryAdjustmentsHandler,
  ],
  exports: [InventoryReportRunner],
})
export class InventoryReportsModule {}
