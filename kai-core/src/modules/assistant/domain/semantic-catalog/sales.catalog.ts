import type { SamiDatasetCatalog } from './catalog.types';

export const SALES_CATALOG: SamiDatasetCatalog = {
  dataset: 'sales',
  view: 'v_sami_sales_lines',
  dateField: 'sold_at',
  metrics: [
    { id: 'net_sales', label: 'Ventas netas', column: 'net_sales', aggregate: 'sum' },
    { id: 'qty', label: 'Unidades', column: 'qty', aggregate: 'sum' },
    {
      id: 'cogs',
      label: 'Costo',
      column: 'cogs',
      aggregate: 'sum',
      adminOnly: true,
    },
  ],
  dimensions: [
    { id: 'branch', label: 'Sucursal', column: 'branch_name' },
    { id: 'category', label: 'Categoría', column: 'category_name' },
    { id: 'product', label: 'Producto', column: 'product_name' },
    { id: 'day', label: 'Día', column: 'sold_day' },
    { id: 'customer', label: 'Cliente', column: 'customer_name' },
    { id: 'payment_method', label: 'Medio de pago', column: 'payment_method' },
    { id: 'weekday', label: 'Día de semana', column: 'sold_dow' },
  ],
  filters: [
    { id: 'date', column: 'sold_at', type: 'date' },
    { id: 'branch_id', column: 'branch_id', type: 'uuid' },
    { id: 'category_id', column: 'category_id', type: 'uuid' },
    { id: 'customer_id', column: 'customer_id', type: 'uuid' },
    { id: 'has_customer', column: 'customer_id', type: 'boolean' },
    { id: 'weekday', column: 'sold_dow', type: 'number' },
  ],
};
