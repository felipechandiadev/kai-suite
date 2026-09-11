import type { SamiDatasetCatalog } from './catalog.types';

export const PURCHASING_CATALOG: SamiDatasetCatalog = {
  dataset: 'purchasing',
  view: 'v_sami_purchase_lines',
  dateField: 'purchased_at',
  metrics: [
    {
      id: 'purchase_total',
      label: 'Compras',
      column: 'purchase_total',
      aggregate: 'sum',
    },
    { id: 'qty', label: 'Unidades', column: 'qty', aggregate: 'sum' },
  ],
  dimensions: [
    { id: 'supplier', label: 'Proveedor', column: 'supplier_name' },
    { id: 'product', label: 'Producto', column: 'product_name' },
    { id: 'day', label: 'Día', column: 'purchased_day' },
  ],
  filters: [
    { id: 'date', column: 'purchased_at', type: 'date' },
    { id: 'supplier_id', column: 'supplier_id', type: 'uuid' },
  ],
};
