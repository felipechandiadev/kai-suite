import type { SamiDatasetCatalog } from './catalog.types';

export const INVENTORY_CATALOG: SamiDatasetCatalog = {
  dataset: 'inventory',
  view: 'v_sami_stock_levels',
  dateField: null,
  metrics: [
    {
      id: 'physical_stock',
      label: 'Stock físico',
      column: 'physical_stock',
      aggregate: 'sum',
    },
    {
      id: 'stock_value',
      label: 'Valorización',
      column: 'stock_value',
      aggregate: 'sum',
      adminOnly: true,
    },
  ],
  dimensions: [
    { id: 'storage', label: 'Bodega', column: 'storage_name' },
    { id: 'product', label: 'Producto', column: 'product_name' },
  ],
  filters: [
    { id: 'storage_id', column: 'storage_id', type: 'uuid' },
    { id: 'product_id', column: 'product_id', type: 'uuid' },
  ],
};
