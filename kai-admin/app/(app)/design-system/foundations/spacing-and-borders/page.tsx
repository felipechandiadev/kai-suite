import Link from 'next/link';
import DsPageHeader from '../../_components/DsPageHeader';
import {
  layoutPageRootClassName,
  layoutPageRootClassNameCompact,
} from '@kai/ui';

const SPACING_TOKENS = [
  { token: 'gap-4', usage: 'Default entre cabecera y contenido en layouts (layoutPageRootClassName)' },
  { token: 'gap-2', usage: 'TabPageLayout compact — pestañas pegadas al contenido (DataGrid fill viewport)' },
  { token: 'px-6 pb-6 md:px-10', usage: 'Único padding de página: shell admin (<main> en AppShellLayoutClient)' },
  { token: 'sin p-*/m-* en raíz', usage: 'Páginas y layouts de @kai/ui no añaden padding/margen exterior (evita doble inset)' },
  { token: 'gap-4 (grilla)', usage: 'CollectionPageLayout contentGridGapClassName por defecto' },
];

const BORDER_PATTERNS = [
  {
    name: 'Borde estándar',
    className: 'border border-border',
    css: 'var(--color-border)',
    usage: 'Cards, inputs, contenedores',
  },
  {
    name: 'Línea sutil (DataGrid)',
    className: 'dataGridChrome subtleLineBottom',
    css: 'color-mix(in srgb, var(--color-border) 55%, transparent)',
    usage: 'Headers, filas y footer de DataGrid — ver dataGridChrome.module.css',
  },
  {
    name: 'Borde dashed (docs / vacío)',
    className: 'border border-dashed border-border',
    css: 'var(--color-border)',
    usage: 'Zonas de ejemplo, placeholders de layout',
  },
];

export default function DesignSystemSpacingBordersPage() {
  return (
    <div className="space-y-10">
      <DsPageHeader
        kicker="Foundations"
        title="Espaciado y bordes"
        description="Convenciones de gap, padding del shell y líneas de separación. Preferir tokens y clases compartidas sobre valores mágicos por pantalla."
      />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Espaciado vertical en layouts</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className={`rounded-lg border border-border p-4 ${layoutPageRootClassName}`}>
            <div className="rounded bg-neutral/50 p-3 text-sm">Cabecera</div>
            <div className="rounded bg-neutral/30 p-3 text-sm">Contenido (gap-4)</div>
            <code className="mt-2 block text-xs text-muted-foreground">{layoutPageRootClassName}</code>
          </div>
          <div className={`rounded-lg border border-border p-4 ${layoutPageRootClassNameCompact}`}>
            <div className="rounded bg-neutral/50 p-3 text-sm">Tabs + título</div>
            <div className="rounded bg-neutral/30 p-3 text-sm">DataGrid (gap-2)</div>
            <code className="mt-2 block text-xs text-muted-foreground">{layoutPageRootClassNameCompact}</code>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Clase / patrón</th>
                <th className="px-4 py-2">Uso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {SPACING_TOKENS.map((row) => (
                <tr key={row.token}>
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{row.token}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.usage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Bordes y separadores</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {BORDER_PATTERNS.map((pattern) => (
            <div key={pattern.name} className={`rounded-lg p-4 ${pattern.className.includes('border') ? pattern.className : 'border border-border'}`}>
              <p className="text-sm font-medium text-foreground">{pattern.name}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{pattern.css}</p>
              <p className="mt-2 text-xs text-muted-foreground">{pattern.usage}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-dashed border-border bg-neutral/30 p-4 text-sm text-muted-foreground">
        <h2 className="text-base font-semibold text-foreground">Evitar</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <code className="rounded bg-neutral px-1">p-*</code> /{" "}
            <code className="rounded bg-neutral px-1">m-*</code> /{" "}
            <code className="rounded bg-neutral px-1">pb-16</code> en la raíz de una página o layout
            (el shell ya delimita el área).
          </li>
          <li>Márgenes negativos para “alinear a mano” con el TopBar.</li>
          <li>box-shadow grueso en headers de tabla — usar línea sutil con color-mix.</li>
          <li>border-left en columna de acciones del DataGrid (rompe alineación visual).</li>
        </ul>
      </section>

      <p className="text-sm text-muted-foreground">
        DataGrid:{' '}
        <Link href="/design-system/patterns/data-collection" className="font-medium text-primary hover:underline">
          Patrones → Colecciones
        </Link>
        {' · '}
        <Link href="/design-system/components/datagrid" className="font-medium text-primary hover:underline">
          Showcase interactivo
        </Link>
      </p>
    </div>
  );
}
