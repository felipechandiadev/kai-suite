import Link from 'next/link';
import DsPageHeader from '../../_components/DsPageHeader';

const LAYOUTS = [
  {
    name: 'BasicPageLayout',
    when: 'Pantallas de detalle, configuración, formularios sin pestañas ni búsqueda global.',
    props: 'title, subtitle, children',
    showcase: '/design-system/components/basic-page-layout',
    notes: 'Puede omitir título si el shell ya lo provee. Server Component friendly (sin "use client" en el layout).',
  },
  {
    name: 'TabPageLayout',
    when: 'Módulos con navegación horizontal (ventas, compras, contabilidad). Título a la izquierda, Tabs a la derecha en md+.',
    props: 'title, subtitle, tabs, compact?',
    showcase: '/design-system/components/tab-page-layout',
    notes: 'compact + gap-2 para DataGrid que llena viewport. Usar dataGridFillViewportTabPageProps.',
  },
  {
    name: 'CollectionPageLayout',
    when: 'Catálogos con + , búsqueda sincronizada a URL y grilla de cards (productos, categorías visuales).',
    props: 'title, addAction, showSearch, contentItems, contentGridColumns',
    showcase: '/design-system/components/collection-page-layout',
    notes: 'contentItems=[] muestra empty state centrado. Para tablas densas preferir TabPageLayout + DataGrid.',
  },
];

export default function DesignSystemPageLayoutsPage() {
  return (
    <div className="space-y-10">
      <DsPageHeader
        kicker="Patrones"
        title="Layouts de página"
        description={
          <>
            Tres layouts oficiales en <code className="rounded bg-neutral px-1 py-0.5">@kai/ui</code> comparten tokens en{' '}
            <code className="rounded bg-neutral px-1 py-0.5">layoutPageTokens.ts</code>. Elige uno por pantalla — no mezclar
            estructuras ad hoc.
          </>
        }
      />

      <div className="space-y-6">
        {LAYOUTS.map((layout) => (
          <article key={layout.name} className="rounded-lg border border-border p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-foreground">{layout.name}</h2>
              <Link href={layout.showcase} className="text-sm font-medium text-primary hover:underline">
                Showcase interactivo →
              </Link>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-medium text-foreground">Cuándo</dt>
                <dd className="mt-1 text-muted-foreground">{layout.when}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Props clave</dt>
                <dd className="mt-1 font-mono text-xs text-muted-foreground">{layout.props}</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm text-muted-foreground">{layout.notes}</p>
          </article>
        ))}
      </div>

      <section className="space-y-3 rounded-lg border border-dashed border-border bg-neutral/30 p-4 text-sm text-muted-foreground">
        <h2 className="text-base font-semibold text-foreground">Tokens compartidos</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <code className="rounded bg-neutral px-1">layoutPageTitleClassName</code> — h1 text-lg semibold
          </li>
          <li>
            <code className="rounded bg-neutral px-1">layoutPageContentClassName</code> — min-h-0 flex-1 para scroll interno
          </li>
          <li>
            <code className="rounded bg-neutral px-1">adminFillViewportBelowTopBarClassName</code> — alto bajo TopBar
          </li>
        </ul>
      </section>
    </div>
  );
}
