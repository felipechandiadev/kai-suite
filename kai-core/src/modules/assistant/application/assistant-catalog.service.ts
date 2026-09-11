import { Injectable } from '@nestjs/common';
import { listDatasetCatalogs } from '../domain/semantic-catalog';
import {
  DINING_REPORT_IDS,
  INVENTORY_REPORT_IDS,
  PURCHASING_REPORT_IDS,
  SALES_REPORT_IDS,
} from './prompts/tools-description';

@Injectable()
export class AssistantCatalogService {
  getCatalog() {
    return {
      datasets: listDatasetCatalogs().map((c) => ({
        dataset: c.dataset,
        metrics: c.metrics.map((m) => ({
          id: m.id,
          label: m.label,
          adminOnly: Boolean(m.adminOnly),
        })),
        dimensions: c.dimensions.map((d) => ({ id: d.id, label: d.label })),
        filters: c.filters.map((f) => ({ id: f.id, type: f.type })),
      })),
      reports: {
        sales: [...SALES_REPORT_IDS],
        inventory: [...INVENTORY_REPORT_IDS],
        purchasing: [...PURCHASING_REPORT_IDS],
        dining: [...DINING_REPORT_IDS],
        hcm: ['hours-planned-by-employee'],
      },
    };
  }
}
