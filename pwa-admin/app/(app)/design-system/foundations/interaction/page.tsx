'use client';

import Link from 'next/link';
import { Button, IconButton } from '@kai/ui';
import DsPageHeader from '../../_components/DsPageHeader';

export default function DesignSystemInteractionPage() {
  return (
    <div className="space-y-10">
      <DsPageHeader
        kicker="Foundations"
        title="Interacción"
        description="Estados hover, focus-visible, active y disabled unificados en @kai/ui. Probar con teclado: Tab para focus-visible."
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">Hover</h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>Button primary/secondary contained → fondo accent</li>
            <li>Button outlined → relleno accent, texto background</li>
            <li>IconButton action → color active</li>
            <li>Filas DataGrid → var(--color-hover)</li>
          </ul>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="outlined">Outlined</Button>
            <IconButton icon="Plus" variant="action" aria-label="Agregar" />
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">Focus-visible</h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>outline 2px accent, offset 2px</li>
            <li>Obligatorio en controles interactivos — no quitar sin alternativa accesible</li>
          </ul>
          <div className="flex flex-wrap gap-3">
            <IconButton icon="Search" variant="action" aria-label="Buscar" />
            <IconButton icon="Settings" variant="primary" aria-label="Configuración" />
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">Active / pressed</h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>Button: scale(0.98) + sombra inset</li>
            <li>IconButton filled: brightness(0.92)</li>
          </ul>
          <Button variant="primary">Mantener clic</Button>
        </div>

        <div className="space-y-4 rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">Disabled</h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>Opacidad reducida + cursor-not-allowed</li>
            <li>Sin hover ni active</li>
          </ul>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" disabled>
              Disabled
            </Button>
            <IconButton icon="Trash2" variant="action" disabled aria-label="Eliminar" />
          </div>
        </div>
      </section>

      <section className="space-y-3 text-sm text-muted-foreground">
        <h2 className="text-xl font-semibold text-foreground">Transiciones</h2>
        <p>
          Botones e inputs: ~200ms ease en color, background, border y box-shadow. No animar layout (width/height) en
          listados densos.
        </p>
        <p>
          Paleta completa:{' '}
          <Link href="/design-system/foundations/colors" className="font-medium text-primary hover:underline">
            Foundations → Colores
          </Link>
        </p>
      </section>
    </div>
  );
}
