import {
  DataGridTable,
  type DataGridColumn,
  type DataGridProps,
} from "@kai/ui";

export type { DataGridColumn };

/** Defaults Lite: sin Excel/filtros Suite; paginación controlada en memoria. */
const LITE_DEFAULTS: Partial<DataGridProps> = {
  showExportButton: false,
  showSortButton: false,
  showFilterButton: false,
  showSearch: false,
  paginationMode: "controlled",
  fillViewport: true,
  pinActionsColumn: true,
};

/** El DataGrid no hace slice: el padre pasa la página actual y `totalRows` = total. */
export function slicePage<T>(rows: T[], page: number, limit: number): T[] {
  const p = Math.max(1, page);
  const l = Math.max(1, limit);
  const start = (p - 1) * l;
  return rows.slice(start, start + l);
}

/**
 * DataGrid de `@kai/ui` listo para Vite.
 * Usar siempre esto (o `DataGridTable`) — nunca el export default `DataGrid` (usa next/dynamic).
 */
export function LiteDataGrid(props: DataGridProps) {
  return <DataGridTable {...LITE_DEFAULTS} {...props} />;
}
