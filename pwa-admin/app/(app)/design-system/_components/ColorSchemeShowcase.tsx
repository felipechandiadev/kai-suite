'use client';

import React from 'react';
import { Alert, Button, IconButton } from '@kai/ui';

type ColorToken = {
  id: string;
  label: string;
  cssVar: string;
  usage: string;
  tailwind?: string;
  textOnSwatch?: 'light' | 'dark';
};

const BRAND_TOKENS: ColorToken[] = [
  {
    id: 'primary',
    label: 'Primary',
    cssVar: '--color-primary',
    tailwind: 'bg-primary text-primary border-primary',
    usage: 'Marca principal, botones contained, énfasis estructural (top bar, títulos de acción).',
    textOnSwatch: 'light',
  },
  {
    id: 'secondary',
    label: 'Secondary',
    cssVar: '--color-secondary',
    tailwind: 'bg-secondary text-secondary',
    usage: 'Acento secundario Kai (cyan). Botones secondary, highlights decorativos.',
    textOnSwatch: 'dark',
  },
  {
    id: 'accent',
    label: 'Accent / Active',
    cssVar: '--color-accent',
    tailwind: 'text-accent',
    usage: 'Hover de botones primary, focus ring, links activos, estado seleccionado.',
    textOnSwatch: 'light',
  },
];

const SURFACE_TOKENS: ColorToken[] = [
  {
    id: 'background',
    label: 'Background',
    cssVar: '--color-background',
    tailwind: 'bg-background',
    usage: 'Fondo de página y contenedores base.',
    textOnSwatch: 'dark',
  },
  {
    id: 'surface',
    label: 'Surface',
    cssVar: '--color-surface',
    tailwind: 'bg-surface',
    usage: 'Tarjetas, paneles elevados, inputs sobre fondo.',
    textOnSwatch: 'dark',
  },
  {
    id: 'foreground',
    label: 'Foreground',
    cssVar: '--color-foreground',
    tailwind: 'text-foreground',
    usage: 'Texto principal, iconos neutros, bordes outlined.',
    textOnSwatch: 'light',
  },
  {
    id: 'border',
    label: 'Border',
    cssVar: '--color-border',
    tailwind: 'border-border',
    usage: 'Separadores, bordes de inputs, grids, cards.',
    textOnSwatch: 'dark',
  },
  {
    id: 'neutral',
    label: 'Neutral',
    cssVar: '--color-neutral',
    tailwind: 'bg-neutral',
    usage: 'Fondos suaves (filas expandidas, chips, zonas secundarias).',
    textOnSwatch: 'dark',
  },
  {
    id: 'muted',
    label: 'Muted (tinte)',
    cssVar: '--color-muted',
    tailwind: 'bg-muted',
    usage: 'Tinte / fondo suave (chips, zonas decorativas). No usar para texto legible.',
    textOnSwatch: 'dark',
  },
  {
    id: 'muted-foreground',
    label: 'Muted foreground',
    cssVar: '--color-muted-foreground',
    tailwind: 'text-muted-foreground',
    usage: 'Texto secundario, placeholders, metadatos, hints, subtítulos de layout.',
    textOnSwatch: 'light',
  },
  {
    id: 'hover',
    label: 'Hover',
    cssVar: '--color-hover',
    tailwind: 'bg-hover',
    usage: 'Fondo de filas/listas en hover (DataGrid, menús). Mezcla neutral + background.',
    textOnSwatch: 'dark',
  },
];

const FEEDBACK_TOKENS: ColorToken[] = [
  {
    id: 'success',
    label: 'Success',
    cssVar: '--color-success',
    tailwind: 'text-success',
    usage: 'Confirmaciones, operaciones completadas, estados OK, Alert success.',
    textOnSwatch: 'light',
  },
  {
    id: 'info',
    label: 'Info',
    cssVar: '--color-info',
    tailwind: 'text-info',
    usage: 'Información contextual, ayuda, mensajes informativos, Alert info.',
    textOnSwatch: 'light',
  },
  {
    id: 'warning',
    label: 'Warning',
    cssVar: '--color-warning',
    tailwind: 'text-warning',
    usage: 'Advertencias reversibles, validaciones preventivas, Alert warning.',
    textOnSwatch: 'dark',
  },
  {
    id: 'error',
    label: 'Error',
    cssVar: '--color-error',
    tailwind: 'text-error',
    usage: 'Errores, acciones destructivas, fallos de validación, Alert error.',
    textOnSwatch: 'light',
  },
];

const APP_TOKENS: ColorToken[] = [
  {
    id: 'sidebar-bg',
    label: 'Sidebar bg',
    cssVar: '--color-sidebar-bg',
    usage: 'Fondo semitransparente del sidebar + backdrop-blur.',
    textOnSwatch: 'dark',
  },
  {
    id: 'sidebar-overlay',
    label: 'Sidebar overlay',
    cssVar: '--color-sidebar-overlay',
    usage: 'Overlay móvil al abrir menú lateral.',
    textOnSwatch: 'light',
  },
];

function rgbChannelToHex(channel: string): string {
  return Math.round(Number(channel)).toString(16).padStart(2, '0');
}

/** Convierte rgb()/rgba() del DOM a #RRGGBB (ignora alpha en el hex). */
function rgbStringToHex(rgb: string): string | null {
  const match = rgb.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (!match) return null;
  return `#${rgbChannelToHex(match[1])}${rgbChannelToHex(match[2])}${rgbChannelToHex(match[3])}`.toUpperCase();
}

/** Normaliza el valor computado para mostrar hex o rgba legible. */
function formatResolvedColor(computed: string): string {
  const trimmed = computed.trim();
  if (!trimmed) return '—';
  if (trimmed.startsWith('#')) return trimmed.toUpperCase();

  const hex = rgbStringToHex(trimmed);
  if (hex) {
    const alphaMatch = trimmed.match(/^rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)/i);
    if (alphaMatch && Number(alphaMatch[1]) < 1) {
      return `${hex} · ${Math.round(Number(alphaMatch[1]) * 100)}% opacidad`;
    }
    return hex;
  }

  return trimmed;
}

function useResolvedTokenColor(cssVar: string): string {
  const [resolved, setResolved] = React.useState('…');

  React.useEffect(() => {
    const read = () => {
      const probe = document.createElement('span');
      probe.style.position = 'fixed';
      probe.style.visibility = 'hidden';
      probe.style.pointerEvents = 'none';
      probe.style.backgroundColor = `var(${cssVar})`;
      document.body.appendChild(probe);
      const computed = getComputedStyle(probe).backgroundColor;
      probe.remove();
      setResolved(formatResolvedColor(computed));
    };

    read();

    const darkMq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => read();
    darkMq.addEventListener('change', onChange);
    return () => darkMq.removeEventListener('change', onChange);
  }, [cssVar]);

  return resolved;
}

function Swatch({ token }: { token: ColorToken }) {
  const fg = token.textOnSwatch === 'light' ? '#ffffff' : '#131615';
  const colorCode = useResolvedTokenColor(token.cssVar);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div
        className="flex h-20 items-end p-3"
        style={{ backgroundColor: `var(${token.cssVar})`, color: fg }}
      >
        <span className="text-xs font-semibold drop-shadow-sm">{token.label}</span>
      </div>
      <div className="space-y-2 p-3 text-xs">
        <p className="font-mono text-foreground">{token.cssVar}</p>
        <p className="font-mono text-sm font-semibold tracking-wide text-primary">{colorCode}</p>
        {token.tailwind ? (
          <p className="text-muted-foreground">
            Tailwind: <code className="rounded bg-neutral px-1 py-0.5">{token.tailwind}</code>
          </p>
        ) : null}
        <p className="leading-relaxed text-muted-foreground">{token.usage}</p>
      </div>
    </div>
  );
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export default function ColorSchemeShowcase() {
  return (
    <div className="space-y-12">

      {/* Reglas */}
      <section className="space-y-4">
        <SectionTitle
          title="Reglas de uso"
          description="Convenciones para mantener consistencia entre pantallas ERP y @kai/ui."
        />
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Situación</th>
                <th className="px-4 py-2">Token / patrón</th>
                <th className="px-4 py-2">Evitar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 align-top">Texto principal</td>
                <td className="px-4 py-3 align-top font-mono text-xs text-foreground">text-foreground</td>
                <td className="px-4 py-3 align-top text-muted-foreground">text-gray-900 sueltos</td>
              </tr>
              <tr>
                <td className="px-4 py-3 align-top">Texto secundario / hints</td>
                <td className="px-4 py-3 align-top font-mono text-xs text-foreground">text-muted-foreground</td>
                <td className="px-4 py-3 align-top text-muted-foreground">text-muted-foreground (tinte) · opacity sobre foreground</td>
              </tr>
              <tr>
                <td className="px-4 py-3 align-top">Fondo de página</td>
                <td className="px-4 py-3 align-top font-mono text-xs text-foreground">bg-background</td>
                <td className="px-4 py-3 align-top text-muted-foreground">bg-white hardcodeado</td>
              </tr>
              <tr>
                <td className="px-4 py-3 align-top">Hover filas / listas</td>
                <td className="px-4 py-3 align-top font-mono text-xs text-foreground">bg-hover o var(--color-hover)</td>
                <td className="px-4 py-3 align-top text-muted-foreground">bg-gray-50 arbitrario</td>
              </tr>
              <tr>
                <td className="px-4 py-3 align-top">CTA principal</td>
                <td className="px-4 py-3 align-top font-mono text-xs text-foreground">Button primary → primary / hover accent</td>
                <td className="px-4 py-3 align-top text-muted-foreground">Nuevo hex por pantalla</td>
              </tr>
              <tr>
                <td className="px-4 py-3 align-top">Focus teclado</td>
                <td className="px-4 py-3 align-top font-mono text-xs text-foreground">outline 2px accent, offset 2px</td>
                <td className="px-4 py-3 align-top text-muted-foreground">outline:none sin alternativa</td>
              </tr>
              <tr>
                <td className="px-4 py-3 align-top">Bordes sutiles</td>
                <td className="px-4 py-3 align-top font-mono text-xs text-foreground">border-border o color-mix con border</td>
                <td className="px-4 py-3 align-top text-muted-foreground">#ccc sueltos</td>
              </tr>
              <tr>
                <td className="px-4 py-3 align-top">Feedback usuario</td>
                <td className="px-4 py-3 align-top font-mono text-xs text-foreground">success / warning / error / info</td>
                <td className="px-4 py-3 align-top text-muted-foreground">Verde/rojo custom por módulo</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Paleta marca */}
      <section className="space-y-4">
        <SectionTitle title="Marca e interacción" description="Primary, secondary y accent — jerarquía de acciones." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BRAND_TOKENS.map((t) => (
            <Swatch key={t.id} token={t} />
          ))}
        </div>
      </section>

      {/* Superficies */}
      <section className="space-y-4">
        <SectionTitle title="Superficies y texto" description="Capas de fondo, texto y separación." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SURFACE_TOKENS.map((t) => (
            <Swatch key={t.id} token={t} />
          ))}
        </div>
      </section>

      {/* Feedback */}
      <section className="space-y-4">
        <SectionTitle title="Feedback semántico" description="Estados de resultado y alertas." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEEDBACK_TOKENS.map((t) => (
            <Swatch key={t.id} token={t} />
          ))}
        </div>
        <div className="grid max-w-3xl gap-3">
          <Alert variant="success"><span className="text-sm">Operación completada.</span></Alert>
          <Alert variant="info"><span className="text-sm">Información contextual.</span></Alert>
          <Alert variant="warning"><span className="text-sm">Revise antes de continuar.</span></Alert>
          <Alert variant="error"><span className="text-sm">No se pudo guardar.</span></Alert>
        </div>
      </section>

      {/* App shell */}
      <section className="space-y-4">
        <SectionTitle title="Shell de aplicación" description="Tokens específicos del layout admin (sidebar)." />
        <div className="grid gap-4 sm:grid-cols-2">
          {APP_TOKENS.map((t) => (
            <Swatch key={t.id} token={t} />
          ))}
        </div>
      </section>

      {/* Estados interactivos */}
      <section className="space-y-6">
        <SectionTitle
          title="Estados interactivos"
          description="Patrones oficiales en @kai/ui (Button, IconButton). Probar con teclado: Tab + focus-visible."
        />
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4 rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold text-foreground">Hover</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>Contained primary/secondary: fondo pasa a <code className="rounded bg-neutral px-1">accent</code></li>
              <li>Outlined: relleno accent + texto background</li>
              <li>IconButton action: texto <code className="rounded bg-neutral px-1">active</code></li>
              <li>Filas DataGrid: <code className="rounded bg-neutral px-1">--color-hover</code></li>
            </ul>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Hover me</Button>
              <Button variant="outlined">Outlined</Button>
              <IconButton icon="Plus" variant="action" aria-label="Agregar" />
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold text-foreground">Focus-visible</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>IconButton / RangeSlider: <code className="rounded bg-neutral px-1">outline 2px accent</code>, offset 2px</li>
              <li>Siempre visible al navegar con teclado; no quitar sin reemplazo</li>
            </ul>
            <div className="flex flex-wrap gap-3">
              <IconButton icon="Search" variant="action" aria-label="Buscar" />
              <IconButton icon="Settings" variant="primary" aria-label="Configuración" />
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold text-foreground">Active / pressed</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>Button: <code className="rounded bg-neutral px-1">scale(0.9)</code> + sombra inset</li>
              <li>IconButton filled: <code className="rounded bg-neutral px-1">brightness(0.92)</code></li>
            </ul>
            <Button variant="primary">Mantener clic</Button>
          </div>

          <div className="space-y-4 rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold text-foreground">Disabled</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>Opacidad reducida + <code className="rounded bg-neutral px-1">cursor-not-allowed</code></li>
              <li>Sin hover ni active</li>
            </ul>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" disabled>
                Disabled
              </Button>
              <IconButton icon="Trash2" variant="action" disabled aria-label="Eliminar" />
            </div>
          </div>
        </div>
      </section>

      {/* Efectos */}
      <section className="space-y-4">
        <SectionTitle
          title="Efectos y mezclas"
          description="Preferir color-mix sobre grises inventados cuando se necesite suavizar un token."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <div
            className="rounded-lg border border-border p-4"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-neutral) 65%, var(--color-background))',
            }}
          >
            <p className="text-sm font-medium text-foreground">--color-hover (definición en globals)</p>
            <p className="mt-1 text-xs text-muted-foreground">color-mix(neutral 65%, background)</p>
          </div>
          <div
            className="rounded-lg border p-4"
            style={{
              borderColor: 'color-mix(in srgb, var(--color-border) 55%, transparent)',
            }}
          >
            <p className="text-sm font-medium text-foreground">Borde sutil (ej. DataGrid col header)</p>
            <p className="mt-1 text-xs text-muted-foreground">color-mix(border 55%, transparent)</p>
          </div>
        </div>
      </section>

      {/* Implementación */}
      <section className="space-y-3 rounded-lg border border-dashed border-border bg-neutral/40 p-4">
        <h2 className="text-lg font-semibold text-foreground">Implementación</h2>
        <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
          <li>
            Nuevo token: añadir en <code className="rounded bg-neutral px-1">globals.css</code> (:root + bloque dark) y en{' '}
            <code className="rounded bg-neutral px-1">@theme inline</code> para Tailwind v4.
          </li>
          <li>
            Componentes @kai/ui: CSS colocalizado (<code className="rounded bg-neutral px-1">*.css</code> junto al TSX) con{' '}
            <code className="rounded bg-neutral px-1">var(--color-*)</code>.
          </li>
          <li>
            Dominio admin (<code className="rounded bg-neutral px-1">pwa-admin/src/shared</code>): igual — tokens, no hex sueltos.
          </li>
          <li>Transiciones estándar en botones: ~200ms ease en color, background, border, box-shadow.</li>
        </ul>
      </section>
    </div>
  );
}
