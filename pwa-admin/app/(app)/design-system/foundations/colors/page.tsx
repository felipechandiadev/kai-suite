import DsPageHeader from '../../_components/DsPageHeader';
import ColorSchemeShowcase from '../../_components/ColorSchemeShowcase';
import { Alert } from '@kai/ui';

export default function DesignSystemColorsPage() {
  return (
    <div className="space-y-8">
      <DsPageHeader
        kicker="Foundations"
        title="Colores"
        description={
          <>
            Referencia viva de tokens Kai. Valores en{' '}
            <code className="rounded bg-neutral px-1 py-0.5">pwa-admin/app/globals.css</code> y contrato en{' '}
            <code className="rounded bg-neutral px-1 py-0.5">packages/ui/src/theme/tokens.css</code>. Los componentes consumen{' '}
            <code className="rounded bg-neutral px-1 py-0.5">var(--color-*)</code> — no hex sueltos en UI.
          </>
        }
      />
      <Alert variant="info">
        <span className="text-sm">
          Modo oscuro: <code className="rounded bg-neutral/80 px-1">prefers-color-scheme: dark</code> en globals.css. Cambia el
          esquema del SO para previsualizarlo.
        </span>
      </Alert>
      <ColorSchemeShowcase />
    </div>
  );
}
