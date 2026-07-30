import { Injectable, NotFoundException } from '@nestjs/common';
import {
  SalesReportCatalogItem,
  SalesReportHandler,
  SalesReportRunResult,
} from '../domain/sales-report.types';
import {
  CashSessionCloseHandler,
  CustomerPurchasesHandler,
  CustomerReturnsHandler,
  SalesByPeriodHandler,
  SalesByProductHandler,
  SalesDetailHandler,
} from './handlers/mvp.handlers';
import {
  BackordersStatusHandler,
  CreditNotesHandler,
  PromotionRedemptionsHandler,
  QuotationsFunnelHandler,
  SalesByCategoryHandler,
  SalesByPaymentMethodHandler,
  SalesByPosHandler,
  TopProductsHandler,
} from './handlers/p1.handlers';

@Injectable()
export class SalesReportRunner {
  private readonly handlers: Map<string, SalesReportHandler>;

  constructor(
    salesByPeriod: SalesByPeriodHandler,
    salesDetail: SalesDetailHandler,
    salesByProduct: SalesByProductHandler,
    customerReturns: CustomerReturnsHandler,
    customerPurchases: CustomerPurchasesHandler,
    cashSessionClose: CashSessionCloseHandler,
    topProducts: TopProductsHandler,
    salesByPaymentMethod: SalesByPaymentMethodHandler,
    salesByPos: SalesByPosHandler,
    creditNotes: CreditNotesHandler,
    promotionRedemptions: PromotionRedemptionsHandler,
    quotationsFunnel: QuotationsFunnelHandler,
    backordersStatus: BackordersStatusHandler,
    salesByCategory: SalesByCategoryHandler,
  ) {
    const list: SalesReportHandler[] = [
      salesByPeriod,
      salesDetail,
      salesByProduct,
      customerReturns,
      customerPurchases,
      cashSessionClose,
      topProducts,
      salesByPaymentMethod,
      salesByPos,
      creditNotes,
      promotionRedemptions,
      quotationsFunnel,
      backordersStatus,
      salesByCategory,
    ];
    this.handlers = new Map(list.map((h) => [h.id, h]));
  }

  listCatalog(): SalesReportCatalogItem[] {
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
  ): Promise<SalesReportRunResult> {
    const handler = this.handlers.get(reportId);
    if (!handler) {
      throw new NotFoundException(`Reporte desconocido: ${reportId}`);
    }
    const validated = handler.validate(params ?? {});
    return handler.run({ companyId, params: validated });
  }
}
