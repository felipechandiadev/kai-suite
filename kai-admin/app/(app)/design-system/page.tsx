import DsPageHeader from './_components/DsPageHeader';
import DsSectionCard from './_components/DsSectionCard';
import { designSystemHubSections } from '@/navigation/designSystemNav';

export default function DesignSystemHomePage() {
  return (
    <div className="space-y-10">
      <DsPageHeader
        title="Kai Design System"
        description={
          <>
            Referencia viva para construir pantallas ERP con <code className="rounded bg-neutral px-1 py-0.5">@kai/ui</code>.
            Foundations, patrones de composición, componentes interactivos y reglas de gobernanza — todo en un solo lugar para
            que ningún escenario quede definido al azar.
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {designSystemHubSections.map((section) => (
          <DsSectionCard
            key={section.id}
            title={section.title}
            description={section.description}
            href={section.href}
          />
        ))}
      </div>

      <section className="rounded-lg border border-dashed border-border bg-neutral/30 p-5 text-sm text-muted-foreground">
        <h2 className="text-base font-semibold text-foreground">Cómo usar esta guía</h2>
        <ol className="mt-3 list-inside list-decimal space-y-2 leading-relaxed">
          <li>
            <strong className="font-medium text-foreground">Visualizar composiciones:</strong> empieza en{' '}
            <a href="/design-system/examples" className="font-medium text-primary hover:underline">
              Ejemplos en contexto
            </a>
            .
          </li>
          <li>
            <strong className="font-medium text-foreground">Nueva pantalla:</strong> elige layout en Patrones → Layouts; tokens
            en Foundations.
          </li>
          <li>
            <strong className="font-medium text-foreground">Listado ERP:</strong> CollectionPageLayout + DataGrid (ver Patrones →
            Colecciones).
          </li>
          <li>
            <strong className="font-medium text-foreground">Componente nuevo en @kai/ui:</strong> añade showcase en{' '}
            <code className="rounded bg-neutral px-1">/design-system/components/*</code> y regístralo en{' '}
            <code className="rounded bg-neutral px-1">designSystemNav.ts</code>.
          </li>
        </ol>
      </section>
    </div>
  );
}
