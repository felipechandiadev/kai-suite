import { Injectable, NotFoundException } from '@nestjs/common';
import {
  HcmReportCatalogItem,
  HcmReportHandler,
  HcmReportRunResult,
} from '../domain/hcm-report.types';
import { HoursPlannedByEmployeeHandler } from './handlers/hours-planned.handler';

@Injectable()
export class HcmReportRunner {
  private readonly handlers: Map<string, HcmReportHandler>;

  constructor(hoursPlanned: HoursPlannedByEmployeeHandler) {
    const list: HcmReportHandler[] = [hoursPlanned];
    this.handlers = new Map(list.map((h) => [h.id, h]));
  }

  listCatalog(): HcmReportCatalogItem[] {
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
  ): Promise<HcmReportRunResult> {
    const handler = this.handlers.get(reportId);
    if (!handler) {
      throw new NotFoundException(`Reporte desconocido: ${reportId}`);
    }
    const validated = handler.validate(params ?? {});
    return handler.run({ companyId, params: validated });
  }
}
