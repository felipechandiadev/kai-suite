import Link from 'next/link';
import DsPageHeader from '../../_components/DsPageHeader';
import {
  layoutPageSubtitleClassName,
  layoutPageTitleClassName,
} from '@kai/ui';

const TYPE_SCALE = [
  { name: 'Página (h1 layout)', className: layoutPageTitleClassName, sample: 'Productos', usage: 'BasicPageLayout, TabPageLayout, CollectionPageLayout' },
  { name: 'Sección (h2)', className: 'text-xl font-semibold text-foreground', sample: 'Reglas de uso', usage: 'Bloques dentro de una página, modales largos' },
  { name: 'Subsección (h3)', className: 'text-sm font-semibold text-foreground', sample: 'Estados interactivos', usage: 'Cards de documentación, paneles colapsables' },
  { name: 'Subtítulo layout', className: layoutPageSubtitleClassName, sample: 'Listado de artículos del catálogo', usage: 'Bajo el h1 en layouts oficiales' },
  { name: 'Cuerpo', className: 'text-sm text-foreground', sample: 'Descripción de la operación o hint de campo.', usage: 'Párrafos, labels secundarios' },
  { name: 'Metadato / hint', className: 'text-sm text-muted-foreground', sample: 'Última actualización hace 2 horas', usage: 'Placeholders, timestamps, ayuda contextual' },
  { name: 'Caption / overline', className: 'text-xs font-semibold uppercase tracking-wide text-muted-foreground', sample: 'Foundations', usage: 'Kickers, encabezados de tabla, badges de sección' },
  { name: 'Mono / token', className: 'font-mono text-xs text-foreground', sample: '--color-primary', usage: 'Variables CSS, snippets técnicos' },
];

export default function DesignSystemTypographyPage() {
  return (
    <div className="space-y-10">
      <DsPageHeader
        kicker="Foundations"
        title="Tipografía"
        description={
          <>
            Fuente base <strong className="font-medium text-foreground">Inter</strong> (fallback System UI) definida en{' '}
            <code className="rounded bg-neutral px-1 py-0.5">globals.css</code>. Los layouts comparten clases en{' '}
            <code className="rounded bg-neutral px-1 py-0.5">layoutPageTokens.ts</code> — reutilízalas en lugar de inventar
            tamaños por pantalla.
          </>
        }
      />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Escala tipográfica</h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Rol</th>
                <th className="px-4 py-2">Muestra</th>
                <th className="px-4 py-2">Cuándo usar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {TYPE_SCALE.map((row) => (
                <tr key={row.name}>
                  <td className="px-4 py-3 align-top">
                    <p className="font-medium text-foreground">{row.name}</p>
                    <code className="mt-1 block max-w-xs break-all text-xs text-muted-foreground">{row.className}</code>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className={row.className}>{row.sample}</span>
                  </td>
                  <td className="px-4 py-3 align-top text-muted-foreground">{row.usage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Reglas</h2>
        <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
          <li>Un solo h1 por vista — lo provee el layout de página, no repetir en hijos.</li>
          <li>
            Texto secundario: <code className="rounded bg-neutral px-1">text-muted-foreground</code> (
            <code className="rounded bg-neutral px-1">--color-muted-foreground</code>), no{' '}
            <code className="rounded bg-neutral px-1">text-muted</code> ni{' '}
            <code className="rounded bg-neutral px-1">text-foreground/60</code>.
          </li>
          <li>
            Tinte / fondo suave: <code className="rounded bg-neutral px-1">bg-muted</code> (
            <code className="rounded bg-neutral px-1">--color-muted</code>).
          </li>
          <li>
            Títulos de DataGrid y toolbar: heredan del layout; no usar{' '}
            <code className="rounded bg-neutral px-1">text-3xl</code> en listados ERP.
          </li>
          <li>
            En POS (touch): TextField y botones pueden usar variantes touch; la jerarquía h1/h2 se mantiene igual.
          </li>
        </ul>
      </section>

      <p className="text-sm text-muted-foreground">
        Layouts en acción:{' '}
        <Link href="/design-system/patterns/page-layouts" className="font-medium text-primary hover:underline">
          Patrones → Layouts de página
        </Link>
      </p>
    </div>
  );
}
