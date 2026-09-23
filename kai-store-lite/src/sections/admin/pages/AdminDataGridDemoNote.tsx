/**
 * Prefer `LiteDataGrid` (`@/shared/components/LiteDataGrid`).
 * Always import `DataGridTable as DataGrid` from `@kai/ui` — never the default `DataGrid`
 * (Next.js dynamic wrapper; breaks Vite).
 */
export function AdminDataGridDemoNote() {
  return (
    <p className="p-4 text-sm text-muted-foreground">
      DataGrid activo vía <code>LiteDataGrid</code> en Catálogo, Transacciones, Sesiones,
      Existencias, Usuarios e Impresión.
    </p>
  );
}
