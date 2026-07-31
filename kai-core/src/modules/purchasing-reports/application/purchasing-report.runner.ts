import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PurchasingReportCatalogItem,
  PurchasingReportHandler,
  PurchasingReportRunResult,
} from '../domain/purchasing-report.types';
import {
  PurchaseDetailHandler,
  PurchasesByPaymentMethodHandler,
  PurchasesByPeriodHandler,
  PurchasesByProductHandler,
  PurchasesBySupplierHandler,
  SupplierReturnsHandler,
} from './handlers/mvp.handlers';
import { PurchasesPeriodCompareHandler } from './handlers/compare.handlers';

@Injectable()
export class PurchasingReportRunner {
  private readonly handlers: Map<string, PurchasingReportHandler>;

  constructor(
    purchasesByPeriod: PurchasesByPeriodHandler,
    purchaseDetail: PurchaseDetailHandler,
    purchasesByProduct: PurchasesByProductHandler,
    supplierReturns: SupplierReturnsHandler,
    purchasesBySupplier: PurchasesBySupplierHandler,
    purchasesByPaymentMethod: PurchasesByPaymentMethodHandler,
    purchasesPeriodCompare: PurchasesPeriodCompareHandler,
  ) {
    const list: PurchasingReportHandler[] = [
      purchasesByPeriod,
      purchaseDetail,
      purchasesByProduct,
      supplierReturns,
      purchasesBySupplier,
      purchasesByPaymentMethod,
      purchasesPeriodCompare,
    ];
    this.handlers = new Map(list.map((h) => [h.id, h]));
  }

  listCatalog(): PurchasingReportCatalogItem[] {
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
  ): Promise<PurchasingReportRunResult> {
    const handler = this.handlers.get(reportId);
    if (!handler) {
      throw new NotFoundException(`Reporte desconocido: ${reportId}`);
    }
    const validated = handler.validate(params ?? {});
    return handler.run({ companyId, params: validated });
  }
}
