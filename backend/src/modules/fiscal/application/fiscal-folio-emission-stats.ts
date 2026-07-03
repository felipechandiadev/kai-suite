import type { Repository } from 'typeorm';
import type { FiscalDteEmission } from '../domain/fiscal-dte-emission.entity';
import type { SiiEnvironment } from '../domain/fiscal.enums';

export type FolioEmissionRangeFilter = {
  companyId: string;
  dteType: number;
  environment: SiiEnvironment;
  rangeFrom: number;
  rangeTo: number;
  allocationId?: string;
  pointOfSaleId?: string;
};

/** Folios ya consumidos en un rango (cualquier estado SII: EPR, RCH, FAILED, etc.). */
export async function fetchDistinctEmittedFoliosInRange(
  emissionRepo: Repository<FiscalDteEmission>,
  filter: FolioEmissionRangeFilter,
): Promise<Set<number>> {
  const qb = emissionRepo
    .createQueryBuilder('e')
    .select('e.folio', 'folio')
    .where('e.company_id = :companyId', { companyId: filter.companyId })
    .andWhere('e.dte_type = :dteType', { dteType: filter.dteType })
    .andWhere('e.environment = :environment', { environment: filter.environment })
    .andWhere('e.folio >= :rangeFrom', { rangeFrom: filter.rangeFrom })
    .andWhere('e.folio <= :rangeTo', { rangeTo: filter.rangeTo });

  if (filter.allocationId) {
    if (filter.pointOfSaleId) {
      qb.andWhere(
        '(e.allocation_id = :allocationId OR (e.allocation_id IS NULL AND e.point_of_sale_id = :pointOfSaleId))',
        { allocationId: filter.allocationId, pointOfSaleId: filter.pointOfSaleId },
      );
    } else {
      qb.andWhere('e.allocation_id = :allocationId', { allocationId: filter.allocationId });
    }
  }

  const rows = await qb.getRawMany<{ folio: number }>();
  return new Set(rows.map((r) => Number(r.folio)).filter((n) => Number.isFinite(n)));
}

export function computeFolioRangeStats(
  rangeFrom: number,
  rangeTo: number,
  emittedFolios: Set<number>,
): { total: number; emittedCount: number; available: number } {
  const total = Math.max(0, rangeTo - rangeFrom + 1);
  const emittedCount = emittedFolios.size;
  const available = Math.max(0, total - emittedCount);
  return { total, emittedCount, available };
}
