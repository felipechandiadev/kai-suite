import type { SamiDatasetCatalog } from './catalog.types';

export const DINING_CATALOG: SamiDatasetCatalog = {
  dataset: 'dining',
  view: 'v_sami_dining_orders',
  dateField: 'opened_at',
  metrics: [
    {
      id: 'order_count',
      label: 'Cuentas',
      column: 'order_id',
      aggregate: 'count',
    },
    { id: 'covers', label: 'Ítems', column: 'qty', aggregate: 'sum' },
  ],
  dimensions: [
    { id: 'branch', label: 'Sucursal', column: 'branch_name' },
    { id: 'kind', label: 'Tipo', column: 'kind' },
    { id: 'status', label: 'Estado', column: 'status' },
    { id: 'day', label: 'Día', column: 'opened_day' },
  ],
  filters: [
    { id: 'date', column: 'opened_at', type: 'date' },
    { id: 'branch_id', column: 'branch_id', type: 'uuid' },
  ],
};
