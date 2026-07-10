'use client';

import { Suspense, useCallback, useMemo } from 'react';
import { DataGridTable as DataGrid } from '@kai/ui';
import type { DataGridColumn } from '@kai/ui';
import { RowActions } from '@kai/ui';

type PropRow = { prop: string; type: string; default: string; desc: string };

function PropsReferenceTable({ title, rows }: { title: string; rows: PropRow[] }) {
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600">
            <tr>
              <th className="w-[9rem] px-3 py-2">Prop / campo</th>
              <th className="w-[15rem] px-3 py-2">Type</th>
              <th className="w-[7rem] px-3 py-2">Default</th>
              <th className="px-3 py-2">Función</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.prop} className="align-top">
                <td className="px-3 py-2 font-mono text-xs text-primary break-all">{r.prop}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-600 whitespace-pre-wrap">{r.type}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-500 break-all">{r.default}</td>
                <td className="px-3 py-2 text-gray-700">{r.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Props del componente (DataGrid.tsx) — alineado al código. */
const DATAGRID_PROPS: PropRow[] = [
  { prop: 'columns', type: 'DataGridColumn[]', default: '—', desc: 'Definición de columnas. Ver tabla de DataGridColumn más abajo.' },
  { prop: 'title', type: 'string (opcional)', default: "'' (efecto)", desc: "Título en la cabecera del grid (barra de herramientas superior)." },
  { prop: 'rows', type: 'any[] (opcional)', default: '[]', desc: "Datos por fila. Cada fila debería tener un identificador estable en `id` (o se usa el índice) para expandidas y claves." },
  { prop: 'loading', type: 'boolean', default: 'false (deprecated)', desc: 'Mantenido por compatibilidad; no sustituye el flujo de datos interno al mostrar filas en la implementación actual.' },
  { prop: 'enableSearch', type: 'boolean (opcional)', default: '— (deprecated)', desc: 'Sustituido por `showSearch`. Si no hay `showSearch`, mapea el valor de búsqueda en cabecera.' },
  { prop: 'enablePagination', type: 'boolean (opcional)', default: '— (deprecated)', desc: "Siempre se muestra el pie con paginación; prop histórica." },
  { prop: 'sort', type: "'asc' | 'desc' (opcional)", default: '—', desc: "Declarado en la API; búsqueda, orden y filtros **reales** se leen/escriben vía parámetros de URL (`sort`, `sortField`) desde el Header y `ColHeader`." },
  { prop: 'sortField', type: 'string (opcional)', default: '—', desc: "Columna de orden activa en la URL, no inyectada solo desde esta prop al montar." },
  { prop: 'search', type: 'string (opcional)', default: '—', desc: "Búsqueda global: el campo de búsqueda en la cabecera sincroniza `?search=` con `useSearchParams`." },
  { prop: 'filters', type: 'string (opcional)', default: '—', desc: "Formato de filtros por columna se codifica en `?filters=` (ver `ColHeader`)." },
  { prop: 'height', type: 'number | string', default: "'70vh'", desc: "Alto CSS del contenedor del grid (px si es número, o string e.g. '420px', '50vh'). Ignorado si `fillViewport` es true." },
  { prop: 'fillViewport', type: 'boolean', default: 'false', desc: "Calcula la altura para que el pie quede al borde inferior del viewport; solo el cuerpo (filas) hace scroll. Útil en páginas de listado a pantalla completa." },
  { prop: 'fillViewportInTabLayout', type: 'boolean', default: 'false', desc: "Con `fillViewport` bajo TabPageLayout: fallback CSS más bajo; la medición en px usa el top real del grid (pestañas incluidas)." },
  { prop: 'viewportBottomInset', type: 'number', default: '24', desc: "Margen inferior en px al calcular `fillViewport` (p. ej. `pb-6` del `<main>` del shell admin)." },
  { prop: 'totalRows', type: 'number (opcional)', default: 'length de rows', desc: "Total de ítems para el pie: paginación y contadores (e.g. resultados de servidor)." },
  { prop: 'totalGeneral', type: 'number (opcional)', default: '—', desc: "Segundo contador en el pie (p. ej. total global) según `Footer`/`Pagination`." },
  { prop: 'createForm', type: 'ReactNode', default: 'undefined', desc: "Contenido o formulario de creación inyectable desde el encabezado (flujo de alta)." },
  { prop: 'createFormTitle', type: 'string (opcional)', default: 'undefined', desc: "Título asociado al flujo de creación (diálogo sección, según `Header`)." },
  { prop: 'onAddClick', type: '() => void (opcional)', default: 'undefined', desc: "Al pulsar el botón de agregar (+) en el header (abre diálogo o navegación externa)." },
  { prop: 'addButtonVariant', type: "'icon' | 'pillOutlined'", default: "'icon'", desc: "Estilo del botón de alta: IconButton + o pill outlined con texto." },
  { prop: 'addButtonLabel', type: 'string (opcional)', default: 'undefined', desc: "Con pillOutlined: texto del botón (ej. 'Recepción'; icono + aparte)." },
  { prop: 'addDisabled', type: 'boolean (opcional)', default: 'false', desc: "Deshabilita el + sin ocultarlo." },
  { prop: 'data-test-id', type: 'string (opcional)', default: '"data-grid-root"', desc: "Atributo en el nodo raíz del grid para e2e." },
  { prop: 'excelUrl', type: 'string (opcional)', default: 'undefined', desc: "URL absoluta o ruta de exportación Excel, si el header la usa." },
  { prop: 'excelFields', type: 'string (opcional)', default: 'undefined', desc: "Campos/serialización asociada al export (según `Header`)." },
  { prop: 'limit', type: 'number', default: '25', desc: "Si en la URL no hay `?limit=`, se hace `router.replace` con este valor: tamaño de página por defecto del grid." },
  { prop: 'onExportExcel', type: '() => Promise<void> (opcional)', default: 'undefined', desc: "Callback al exportar; si se define, reemplaza el flujo de export vía `excelUrl` (según `Header`)." },
  { prop: 'showBorder', type: 'boolean', default: 'false', desc: "Borde alrededor del contenedor completo del grid." },
  { prop: 'showSortButton', type: 'boolean', default: 'true', desc: "Muestra el botón/acción global de ordenación en la barra; también activa el estado visual de orden en columnas (`ColHeader` sortingEnabled)." },
  { prop: 'showFilterButton', type: 'boolean', default: 'true', desc: "Permite activar el **modo filtrado** por columnas (toggle `filtration` y inputs en `ColHeader`)." },
  { prop: 'showExportButton', type: 'boolean', default: 'true', desc: "Muestra el botón de exportar en la cabecera (si aplica a tu header)." },
  { prop: 'showSearch', type: 'boolean (opcional)', default: 'true*', desc: "*Si se omite, se toma `enableSearch` o, por defecto, `true`. Controla el campo de búsqueda en el `Header`." },
  { prop: 'onSearchChange', type: '(value: string) => void (opcional)', default: 'undefined', desc: "Callback al cambiar el texto de búsqueda (además de actualizar `?search=` en la URL)." },
  { prop: 'expandable', type: 'boolean', default: 'false', desc: "Primera columna con **chevrón** para expandir; fila extra bajo el registro con `expandableRowContent`." },
  { prop: 'expandableRowContent', type: '(row: any) => ReactNode (opcional)', default: 'undefined', desc: "Contenido renderizado debajo de la fila cuando está expandida." },
  { prop: 'defaultExpandedRowIds', type: '(string | number)[]', default: '[]', desc: "IDs de fila expandidas al montar (ids en `row.id` o el índice de fila si no hay id)." },
  { prop: 'headerActions', type: 'ReactNode (opcional)', default: 'undefined', desc: "Contenido extra en el header (p. ej. filtros de negocio o acciones a la derecha del título)." },
  { prop: 'pinActionsColumn', type: 'boolean', default: 'false', desc: "Fija a la **derecha** con `position: sticky` la columna cuyo `field` coincide con `actionsColumnField` (scroll horizontal)." },
  { prop: 'actionsColumnField', type: "string", default: "'actions'", desc: "Nombre del `field` de la columna de acciones que debe quedar fija (con `pinActionsColumn`)." },
];

const DATAGRID_COLUMN_PROPS: PropRow[] = [
  { prop: 'field', type: "string", default: "—", desc: "Clave de la fila: `row[field]`; también identifica la columna en la URL (sort, filtros)." },
  { prop: 'headerName', type: "string", default: "—", desc: "Texto de cabecera. En columna de acciones, la norma del proyecto es `''` (vacío)." },
  { prop: 'width', type: "number (opcional)", default: "—", desc: "Ancho en px; participa en el cálculo de layout (`calculateColumnStyles`)." },
  { prop: 'minWidth', type: "number (opcional)", default: "—", desc: "Ancho mínimo de la columna." },
  { prop: 'maxWidth', type: "number (opcional)", default: "—", desc: "Ancho máximo de la columna." },
  { prop: 'cellOverflow', type: "'truncate' | 'wrap' | 'clip' | 'visible' (opcional)", default: "'truncate'", desc: "Contenido largo: ellipsis (`truncate`), salto de línea (`wrap`), recorte sin ellipsis (`clip`) o desborde visible (`visible`). Aplica a texto por defecto, `renderCell` y `actionComponent`." },
  { prop: 'flex', type: "number (opcional)", default: "—", desc: "Factor flex para repartir espacio sobrante en la fila de cabecera/cuerpo." },
  { prop: 'type', type: "DataGridColumnType (opcional)", default: "—", desc: "Hint de tipo: 'string' | 'number' | 'date' | 'dateTime' | 'boolean' | 'id' (p. ej. alineación o formato en celdas)." },
  { prop: 'sortable', type: "boolean (opcional)", default: "—", desc: "Si true, al ordenar se escribe `sort` y `sortField` en la URL; iconos de orden en cabecera." },
  { prop: 'editable', type: "boolean (opcional)", default: "—", desc: "Reservado para celdas editables (extensión futura; ver implementación de `Body`)." },
  { prop: 'filterable', type: "boolean (opcional)", default: "true* en ColHeader", desc: "*En `ColHeader` el default es `true` si no se pasa. Si `false`, no se muestra el input de filtro en modo filtración." },
  { prop: 'renderCell', type: "(params) => ReactNode (opcional)", default: "—", desc: "Render personalizado de la celda (toma `row`, `value`, `column`, etc.)." },
  { prop: 'renderType', type: "'currency' | 'badge' | 'dateString' (opcional)", default: "—", desc: "Pistas de presentación en lugar de renderCell explícito (según `Body`)." },
  { prop: 'valueGetter', type: "(params) => any (opcional)", default: "—", desc: "Deriva el valor mostrado sin mutar el objeto fila (útil para campos anidados o formateo)." },
  { prop: 'align', type: "'left' | 'right' | 'center' (opcional)", default: "—", desc: "Alineación del contenido de la celda." },
  { prop: 'headerAlign', type: "'left' | 'right' | 'center' (opcional)", default: "—", desc: "Alineación del texto de la cabecera (donde aplica)." },
  { prop: 'hide', type: "boolean (opcional)", default: "—", desc: "Si `true`, la columna no se renderiza (pero puede seguir en el array para lógica externa)." },
  { prop: 'sticky', type: "boolean (opcional)", default: "—", desc: "Compat: “pegado” a la derecha; preferir `pinActionsColumn` + `actionComponent` en la columna de acciones." },
  { prop: 'actionComponent', type: "ComponentType<{row, column}> (opcional)", default: "—", desc: "Componente para celdas de acciones. Norma: header vacío, IconButton `action` `sm` (ver `RowActions` y `.instructions/webadmin.instruction`)." },
];

const COLUMNS: DataGridColumn[] = [
  { field: 'id', headerName: 'ID', type: 'id', width: 72, sortable: true },
  { field: 'name', headerName: 'Name', type: 'string', flex: 1, minWidth: 160, sortable: true },
  { field: 'status', headerName: 'Status', type: 'string', width: 120 },
  { field: 'total', headerName: 'Total', type: 'number', width: 100, align: 'right' },
];

const ROWS = [
  { id: 1, name: 'Order A', status: 'Paid', total: 12990 },
  { id: 2, name: 'Order B', status: 'Pending', total: 4500 },
  { id: 3, name: 'Order C', status: 'Shipped', total: 22100 },
  { id: 4, name: 'Order D', status: 'Cancelled', total: 0 },
  { id: 5, name: 'Order E', status: 'Paid', total: 9990 },
];

type LineItem = { sku: string; product: string; qty: number; lineTotal: number };

const ORDER_LINES_BY_ID: Record<number, LineItem[]> = {
  1: [
    { sku: 'SKU-101', product: 'Gold bar 1oz', qty: 1, lineTotal: 9990 },
    { sku: 'SKU-220', product: 'Service fee', qty: 1, lineTotal: 3000 },
  ],
  2: [{ sku: 'SKU-404', product: 'Silver coin', qty: 3, lineTotal: 4500 }],
  3: [
    { sku: 'SKU-101', product: 'Gold bar 1oz', qty: 2, lineTotal: 19980 },
    { sku: 'SKU-500', product: 'Shipping', qty: 1, lineTotal: 2120 },
  ],
  4: [],
  5: [{ sku: 'SKU-777', product: 'Gift card', qty: 1, lineTotal: 9990 }],
};

const EXPAND_GRID_COLUMNS: DataGridColumn[] = [
  { field: 'id', headerName: 'ID', type: 'id', width: 64, sortable: true },
  { field: 'name', headerName: 'Order', type: 'string', flex: 1, minWidth: 140, sortable: true },
  { field: 'lineCount', headerName: 'Lines', type: 'number', width: 72, align: 'right' },
  { field: 'total', headerName: 'Total', type: 'number', width: 96, align: 'right' },
];

const EXPAND_GRID_ROWS = [
  { id: 1, name: 'PO-1001', lineCount: 2, total: 12990 },
  { id: 2, name: 'PO-1002', lineCount: 1, total: 4500 },
  { id: 3, name: 'PO-1003', lineCount: 2, total: 22100 },
  { id: 4, name: 'PO-1004', lineCount: 0, total: 0 },
  { id: 5, name: 'PO-1005', lineCount: 1, total: 9990 },
];

/** Varias columnas de datos + acciones: al hacer scroll horizontal, la columna Acciones queda fija a la derecha. */
const PIN_ACTIONS_COLUMNS: DataGridColumn[] = [
  { field: 'id', headerName: 'ID', type: 'id', width: 64, sortable: true },
  { field: 'order', headerName: 'Documento', type: 'string', minWidth: 120, width: 140, sortable: true },
  { field: 'customer', headerName: 'Cliente', type: 'string', minWidth: 160, flex: 1, sortable: true },
  { field: 'status', headerName: 'Estado', type: 'string', width: 100 },
  { field: 'channel', headerName: 'Canal', type: 'string', width: 96 },
  { field: 'createdAt', headerName: 'Fecha', type: 'date', width: 104 },
  { field: 'total', headerName: 'Total', type: 'number', width: 100, align: 'right' },
  {
    field: 'actions',
    headerName: '',
    width: 120,
    minWidth: 120,
    align: 'center',
    sortable: false,
    filterable: false,
    actionComponent: RowActions,
  },
];

const PIN_ACTIONS_ROWS = [
  { id: 1, order: 'FAC-2024-0001', customer: 'Joyería del Centro SpA', status: 'Pagado', channel: 'POS', createdAt: '2024-12-10', total: 1299000 },
  { id: 2, order: 'FAC-2024-0002', customer: 'Comercial Norte Ltda.', status: 'Pendiente', channel: 'Web', createdAt: '2024-12-11', total: 450000 },
  { id: 3, order: 'FAC-2024-0003', customer: 'Inversiones Metálicas SA', status: 'Enviado', channel: 'POS', createdAt: '2024-12-12', total: 2210000 },
  { id: 4, order: 'NC-2024-0001', customer: 'Retail Sur', status: 'Anulado', channel: 'Web', createdAt: '2024-12-12', total: 0 },
  { id: 5, order: 'FAC-2024-0005', customer: 'Casa de Cambio Express', status: 'Pagado', channel: 'POS', createdAt: '2024-12-13', total: 999000 },
];

function DataGridDemo() {
  const columns = useMemo(() => COLUMNS, []);
  const rows = useMemo(() => ROWS, []);

  return (
    <DataGrid
      title="Sample orders"
      columns={columns}
      rows={rows}
      height={420}
      totalRows={rows.length}
      totalGeneral={rows.length}
      showExportButton={false}
      showFilterButton={true}
      showSearch={true}
      showSortButton={true}
      showBorder
    />
  );
}

function DataGridRowExpandDemo() {
  const columns = useMemo(() => EXPAND_GRID_COLUMNS, []);
  const rows = useMemo(() => EXPAND_GRID_ROWS, []);

  const expandableRowContent = useCallback((row: (typeof EXPAND_GRID_ROWS)[0]) => {
    const id = row.id;
    const lines = ORDER_LINES_BY_ID[id] ?? [];
    if (lines.length === 0) {
      return <p className="text-sm text-gray-500">No hay líneas de detalle para este pedido.</p>;
    }
    return (
      <div className="max-w-3xl">
        <h3 className="mb-3 text-sm font-semibold text-gray-800">Líneas del pedido {row.name}</h3>
        <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-100 text-xs text-gray-600">
                <th className="px-3 py-2 font-medium">SKU</th>
                <th className="px-3 py-2 font-medium">Producto</th>
                <th className="px-3 py-2 text-right font-medium">Cant.</th>
                <th className="px-3 py-2 text-right font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.sku} className="border-b border-gray-100 last:border-0">
                  <td className="px-3 py-2 font-mono text-xs text-gray-700">{line.sku}</td>
                  <td className="px-3 py-2 text-gray-800">{line.product}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{line.qty}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-900">
                    ${line.lineTotal.toLocaleString('es-CL')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }, []);

  return (
    <DataGrid
      title="Orders (row expand)"
      columns={columns}
      rows={rows}
      height={400}
      totalRows={rows.length}
      totalGeneral={rows.length}
      showExportButton={false}
      showFilterButton={true}
      showSearch={true}
      showSortButton={true}
      showBorder
      expandable
      expandableRowContent={expandableRowContent}
      defaultExpandedRowIds={[1]}
    />
  );
}

function DataGridPinnedActionsDemo() {
  const columns = useMemo(() => PIN_ACTIONS_COLUMNS, []);
  const rows = useMemo(() => PIN_ACTIONS_ROWS, []);

  return (
    <DataGrid
      title="Documentos (columna acciones fija)"
      columns={columns}
      rows={rows}
      height={400}
      totalRows={rows.length}
      totalGeneral={rows.length}
      showExportButton={false}
      showFilterButton={true}
      showSearch={true}
      showSortButton={true}
      showBorder
      pinActionsColumn
      actionsColumnField="actions"
    />
  );
}

export default function DataGridPage() {
  return (
    <div className="space-y-6 p-8 max-w-6xl">
      <div>
        <h1 className="mb-2 text-3xl font-bold">DataGrid</h1>
        <p className="text-gray-600 max-w-3xl">
          Abajo, <strong>referencia de API</strong> (props del componente y de cada columna). Más adelante, demos con
          datos de prueba. El grid sincroniza <code className="rounded bg-gray-100 px-1">limit</code>,{' '}
          <code className="rounded bg-gray-100 px-1">search</code>, <code className="rounded bg-gray-100 px-1">sort</code>,{' '}
          <code className="rounded bg-gray-100 px-1">sortField</code>, <code className="rounded bg-gray-100 px-1">filters</code>,{' '}
          <code className="rounded bg-gray-100 px-1">page</code> y <code className="rounded bg-gray-100 px-1">filtration</code> con la{' '}
          <strong>query string</strong> (Next.js). Usa el chevrón de la 2.ª sección para <strong>expandir fila</strong>; en la
          3.ª, columna de acciones fija a la derecha.
        </p>
      </div>

      <section className="space-y-8 border-b border-border pb-10" aria-labelledby="datagrid-api-title">
        <h2 id="datagrid-api-title" className="text-2xl font-semibold text-foreground">
          Referencia: props y funcionalidad
        </h2>
        <p className="text-sm text-gray-600 max-w-3xl">
          Fuente: <code className="rounded bg-gray-100 px-1">src/shared/components/DataGrid/DataGrid.tsx</code>. Comportamiento
          de búsqueda, orden, filtros y paginación: <code className="rounded bg-gray-100 px-1">Header</code>,{' '}
          <code className="rounded bg-gray-100 px-1">ColHeader</code>, <code className="rounded bg-gray-100 px-1">Footer</code>,{' '}
          <code className="rounded bg-gray-100 px-1">Pagination</code>.
        </p>
        <PropsReferenceTable title="DataGrid (componente)" rows={DATAGRID_PROPS} />
        <PropsReferenceTable title="DataGridColumn (cada columna en `columns`)" rows={DATAGRID_COLUMN_PROPS} />
      </section>

      <Suspense
        fallback={
          <div className="flex h-[420px] items-center justify-center rounded-lg border border-dashed border-border text-gray-500">
            Loading grid…
          </div>
        }
      >
        <div className="space-y-10">
          <DataGridDemo />
          <div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">Row expand</h2>
            <p className="mb-4 text-sm text-gray-600">
              <code className="rounded bg-gray-100 px-1">expandable</code> y{' '}
              <code className="rounded bg-gray-100 px-1">expandableRowContent</code>; fila 1 inicia expandida (
              <code className="rounded bg-gray-100 px-1">defaultExpandedRowIds</code>).
            </p>
            <DataGridRowExpandDemo />
          </div>
          <div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">Columna de acciones fija (derecha)</h2>
            <p className="mb-4 text-sm text-gray-600">
              <code className="rounded bg-gray-100 px-1">pinActionsColumn</code> + columna con{' '}
              <code className="rounded bg-gray-100 px-1">field: &apos;actions&apos;</code>,{' '}
              <code className="rounded bg-gray-100 px-1">headerName: &apos;&apos;</code> y{' '}
              <code className="rounded bg-gray-100 px-1">actionComponent: RowActions</code> (IconButtons{' '}
              <code className="rounded bg-gray-100 px-1">action</code>). Varias columnas a la izquierda
              para scroll; la columna de acciones queda fija a la derecha.
            </p>
            <DataGridPinnedActionsDemo />
          </div>
        </div>
      </Suspense>
    </div>
  );
}
