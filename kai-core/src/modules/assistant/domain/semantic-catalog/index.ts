import type { SamiDataset } from '../sami-query.types';
import type { SamiDatasetCatalog } from './catalog.types';
import { DINING_CATALOG } from './dining.catalog';
import { INVENTORY_CATALOG } from './inventory.catalog';
import { PURCHASING_CATALOG } from './purchasing.catalog';
import { SALES_CATALOG } from './sales.catalog';

const ALL: Record<SamiDataset, SamiDatasetCatalog> = {
  sales: SALES_CATALOG,
  inventory: INVENTORY_CATALOG,
  purchasing: PURCHASING_CATALOG,
  dining: DINING_CATALOG,
  catalog: SALES_CATALOG,
};

export function getDatasetCatalog(dataset: SamiDataset): SamiDatasetCatalog {
  return ALL[dataset] ?? SALES_CATALOG;
}

export function listDatasetCatalogs(): SamiDatasetCatalog[] {
  return [SALES_CATALOG, INVENTORY_CATALOG, PURCHASING_CATALOG, DINING_CATALOG];
}

export { SALES_CATALOG, INVENTORY_CATALOG, PURCHASING_CATALOG, DINING_CATALOG };
