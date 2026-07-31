import { Injectable, NotFoundException } from '@nestjs/common';
import {
  InventoryReportCatalogItem,
  InventoryReportHandler,
  InventoryReportRunResult,
} from '../domain/inventory-report.types';
import {
  InventoryAdjustmentsHandler,
  InventoryTransfersHandler,
  StockAlertsHandler,
  StockByCategoryHandler,
  StockByStorageHandler,
  StockMovementTrendHandler,
  StockValuationHandler,
} from './handlers/mvp.handlers';
import { InventoryPeriodCompareHandler } from './handlers/compare.handlers';

@Injectable()
export class InventoryReportRunner {
  private readonly handlers: Map<string, InventoryReportHandler>;

  constructor(
    stockValuation: StockValuationHandler,
    stockAlerts: StockAlertsHandler,
    stockByStorage: StockByStorageHandler,
    stockByCategory: StockByCategoryHandler,
    stockMovementTrend: StockMovementTrendHandler,
    inventoryTransfers: InventoryTransfersHandler,
    inventoryAdjustments: InventoryAdjustmentsHandler,
    inventoryPeriodCompare: InventoryPeriodCompareHandler,
  ) {
    const list: InventoryReportHandler[] = [
      stockValuation,
      stockAlerts,
      stockByStorage,
      stockByCategory,
      stockMovementTrend,
      inventoryTransfers,
      inventoryAdjustments,
      inventoryPeriodCompare,
    ];
    this.handlers = new Map(list.map((h) => [h.id, h]));
  }

  listCatalog(): InventoryReportCatalogItem[] {
    return [...this.handlers.values()].map((h) => ({
      id: h.id,
      title: h.title,
      description: h.description,
      wave: h.wave,
    }));
  }

  async run(
    companyId: string,
    reportId: string,
    params: Record<string, unknown>,
  ): Promise<InventoryReportRunResult> {
    const handler = this.handlers.get(reportId);
    if (!handler) {
      throw new NotFoundException(`Reporte desconocido: ${reportId}`);
    }
    const validated = handler.validate(params ?? {});
    return handler.run({ companyId, params: validated });
  }
}
