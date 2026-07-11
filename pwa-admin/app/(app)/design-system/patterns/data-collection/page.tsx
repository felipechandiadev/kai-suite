import Link from 'next/link';
import DsPageHeader from '../../_components/DsPageHeader';

export default function DesignSystemDataCollectionPage() {
  return (
    <div className="space-y-10">
      <DsPageHeader
        kicker="Patrones"
        title="Colecciones y DataGrid"
        description="Patrón estándar para listados ERP: TabPageLayout (compact) + DataGrid con header en grid, toolbar, búsqueda y acciones secundarias."
      />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Anatomía del header DataGrid</h2>
        <div className="rounded-lg border border-border bg-neutral/20 p-4 font-mono text-xs leading-relaxed text-muted-foreground">
          <pre>{`Fila 1 (desktop grid 3 cols):
  [ Add + título ]  |  (vacío)  |  [ Toolbar + Search ]

Fila 2+:
  headerActions — máx. 3 por fila, izquierda → derecha

Mobile (< md):
  stack vertical alineado a la izquierda`}</pre>
        </div>
        <p className="text-sm text-muted-foreground">
          Implementación: <code className="rounded bg-neutral px-1">Header.tsx</code>,{' '}
          <code className="rounded bg-neutral px-1">flattenHeaderActions.ts</code>,{' '}
          <code className="rounded bg-neutral px-1">headerGridPlacement.ts</code>
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Checklist al crear un listado</h2>
        <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
          <li>Envolver en TabPageLayout con compact cuando el grid debe llenar viewport.</li>
          <li>
            Pasar <code className="rounded bg-neutral px-1">fillViewport</code> y{' '}
            <code className="rounded bg-neutral px-1">fillViewportInTabLayout</code> (o{' '}
            <code className="rounded bg-neutral px-1">dataGridFillViewportTabPageProps</code>).
          </li>
          <li>
            <code className="rounded bg-neutral px-1">title</code> en DataGrid para el h1 de la colección (ej. Productos).
          </li>
          <li>headerActions para filtros secundarios — no más de 3 por fila en desktop.</li>
          <li>Alinear columnas: usar paddingX y align compartidos (ver README DataGrid).</li>
          <li>Chrome: bordes sutiles vía dataGridChrome.module.css — no sombras pesadas.</li>
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">CollectionPageLayout vs DataGrid</h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Criterio</th>
                <th className="px-4 py-2">CollectionPageLayout</th>
                <th className="px-4 py-2">DataGrid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3">Densidad</td>
                <td className="px-4 py-3 text-muted-foreground">Cards, pocas columnas</td>
                <td className="px-4 py-3 text-muted-foreground">Muchas columnas, scroll horizontal</td>
              </tr>
              <tr>
                <td className="px-4 py-3">Búsqueda</td>
                <td className="px-4 py-3 text-muted-foreground">URL query integrada</td>
                <td className="px-4 py-3 text-muted-foreground">Search prop + filtros headerActions</td>
              </tr>
              <tr>
                <td className="px-4 py-3">Ejemplo admin</td>
                <td className="px-4 py-3 text-muted-foreground">Showcase collection layout</td>
                <td className="px-4 py-3 text-muted-foreground">Productos, transacciones</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-wrap gap-4 text-sm">
        <Link href="/design-system/components/datagrid" className="font-medium text-primary hover:underline">
          Showcase DataGrid →
        </Link>
        <Link href="/design-system/foundations/spacing-and-borders" className="font-medium text-primary hover:underline">
          Bordes y espaciado →
        </Link>
      </div>
    </div>
  );
}
