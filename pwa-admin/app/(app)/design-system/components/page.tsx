import Link from 'next/link';
import DsPageHeader from '../_components/DsPageHeader';
import { designSystemSections } from '@/navigation/designSystemNav';

const COMPONENT_GROUPS = [
  { label: 'Feedback y estado', ids: ['ui-alert', 'ui-badge', 'ui-dot-progress'] },
  { label: 'Acciones', ids: ['ui-button', 'ui-icon-button'] },
  { label: 'Entrada de datos', ids: ['ui-textfield', 'ui-select', 'ui-autocomplete', 'ui-switch', 'ui-number-stepper', 'ui-range-slider'] },
  { label: 'Overlays', ids: ['ui-dialog'] },
  { label: 'Navegación', ids: ['ui-tabs', 'ui-stepper'] },
  { label: 'Contenedores', ids: ['ui-cards'] },
  { label: 'Datos', ids: ['ui-datagrid'] },
  { label: 'Layouts (showcase)', ids: ['ui-basic-page-layout', 'ui-tab-page-layout', 'ui-collection-page-layout'] },
  { label: 'Dominio / media', ids: ['ui-multimedia'] },
];

export default function DesignSystemComponentsPage() {
  const componentItems =
    designSystemSections.find((s) => s.id === 'components')?.items ?? [];

  const itemsById = new Map(componentItems.map((item) => [item.id, item]));

  return (
    <div className="space-y-10">
      <DsPageHeader
        kicker="Componentes"
        title="Galería @kai/ui"
        description="Showcases interactivos por primitivo. Cada entrada documenta variantes, tokens y situaciones de uso — la implementación vive en packages/ui."
      />

      {COMPONENT_GROUPS.map((group) => {
        const items = group.ids.map((id) => itemsById.get(id)).filter(Boolean);
        if (items.length === 0) return null;

        return (
          <section key={group.label} className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">{group.label}</h2>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) =>
                item ? (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="flex rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/30 hover:bg-neutral/30"
                    >
                      {item.label}
                    </Link>
                  </li>
                ) : null,
              )}
            </ul>
          </section>
        );
      })}

      <p className="text-xs text-muted-foreground">
        Las URLs antiguas <code className="rounded bg-neutral px-1">/ui-components/*</code> redirigen aquí de forma
        permanente.
      </p>
    </div>
  );
}
