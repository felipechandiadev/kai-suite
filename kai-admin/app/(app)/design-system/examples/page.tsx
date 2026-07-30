import DsPageHeader from '../_components/DsPageHeader';
import DesignSystemExamplesShowcase from '../_components/DesignSystemExamplesShowcase';

export default function DesignSystemExamplesPage() {
  return (
    <div className="space-y-10">
      <DsPageHeader
        kicker="Ejemplos"
        title="En contexto"
        description={
          <>
            Composiciones reales del admin ERP: cards, KPIs, formularios, bandejas y feedback combinando primitivos{' '}
            <code className="rounded bg-neutral px-1 py-0.5">@kai/ui</code> y tokens del design system. Referencia visual
            antes de armar una pantalla nueva.
          </>
        }
      />
      <DesignSystemExamplesShowcase />
    </div>
  );
}
