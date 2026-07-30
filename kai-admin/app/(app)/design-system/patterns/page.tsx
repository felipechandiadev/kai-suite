import Link from 'next/link';
import DsPageHeader from '../_components/DsPageHeader';
import DsSectionCard from '../_components/DsSectionCard';

const PATTERN_SECTIONS = [
  {
    title: 'Layouts de página',
    description: 'BasicPageLayout, TabPageLayout y CollectionPageLayout — cuándo usar cada uno y tokens compartidos.',
    href: '/design-system/patterns/page-layouts',
  },
  {
    title: 'Colecciones y DataGrid',
    description: 'Listados ERP: header en grid, fill viewport, alineación columnas y chrome unificado.',
    href: '/design-system/patterns/data-collection',
  },
  {
    title: 'Formularios y feedback',
    description: 'Inputs @kai/ui, validación Zod, Alert inline y Dialog para confirmaciones.',
    href: '/design-system/patterns/forms-feedback',
  },
];

export default function DesignSystemPatternsPage() {
  return (
    <div className="space-y-10">
      <DsPageHeader
        kicker="Patrones"
        title="Patrones de composición"
        description="Escenarios recurrentes del admin ERP: cómo armar una pantalla completa combinando layouts, DataGrid y primitivos — no piezas sueltas."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PATTERN_SECTIONS.map((section) => (
          <DsSectionCard key={section.href} {...section} />
        ))}
      </div>

      <section className="rounded-lg border border-border p-5 text-sm text-muted-foreground">
        <h2 className="text-base font-semibold text-foreground">Matriz rápida</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="bg-neutral text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Escenario</th>
                <th className="px-3 py-2">Layout</th>
                <th className="px-3 py-2">Contenido típico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-3 py-3">Detalle / formulario simple</td>
                <td className="px-3 py-3">BasicPageLayout</td>
                <td className="px-3 py-3">Form, cards, texto</td>
              </tr>
              <tr>
                <td className="px-3 py-3">Módulo con sub-secciones</td>
                <td className="px-3 py-3">TabPageLayout</td>
                <td className="px-3 py-3">Tabs + DataGrid o form</td>
              </tr>
              <tr>
                <td className="px-3 py-3">Catálogo / listado con búsqueda URL</td>
                <td className="px-3 py-3">CollectionPageLayout</td>
                <td className="px-3 py-3">Grilla de cards o slot custom</td>
              </tr>
              <tr>
                <td className="px-3 py-3">Tabla densa ERP</td>
                <td className="px-3 py-3">TabPageLayout compact</td>
                <td className="px-3 py-3">DataGrid fillViewport</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4">
          Componentes:{' '}
          <Link href="/design-system/components" className="font-medium text-primary hover:underline">
            ver galería
          </Link>
        </p>
      </section>
    </div>
  );
}
