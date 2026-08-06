import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DiningReportCatalogItem,
  DiningReportHandler,
  DiningReportRunResult,
} from '../domain/dining-report.types';
import {
  DiningByHourHandler,
  DiningByTableHandler,
  DiningSalonSummaryHandler,
} from './handlers/mvp.handlers';
import { DiningPeriodCompareHandler } from './handlers/compare.handlers';

@Injectable()
export class DiningReportRunner {
  private readonly handlers: Map<string, DiningReportHandler>;

  constructor(
    salonSummary: DiningSalonSummaryHandler,
    byHour: DiningByHourHandler,
    byTable: DiningByTableHandler,
    periodCompare: DiningPeriodCompareHandler,
  ) {
    const list: DiningReportHandler[] = [
      salonSummary,
      byHour,
      byTable,
      periodCompare,
    ];
    this.handlers = new Map(list.map((h) => [h.id, h]));
  }

  listCatalog(): DiningReportCatalogItem[] {
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
  ): Promise<DiningReportRunResult> {
    const handler = this.handlers.get(reportId);
    if (!handler) {
      throw new NotFoundException(`Reporte desconocido: ${reportId}`);
    }
    const validated = handler.validate(params ?? {});
    return handler.run({ companyId, params: validated });
  }
}
