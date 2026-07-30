import Link from 'next/link';
import DsPageHeader from '../../_components/DsPageHeader';

const INPUTS = [
  { name: 'TextField', href: '/design-system/components/textfield', note: 'Texto, número, multiline; variantes admin y touch POS' },
  { name: 'Select', href: '/design-system/components/select', note: 'Opciones cerradas, pocos ítems' },
  { name: 'AutoComplete', href: '/design-system/components/autocomplete', note: 'Búsqueda async, catálogos largos' },
  { name: 'Switch', href: '/design-system/components/switch', note: 'Booleanos inmediatos' },
  { name: 'NumberStepper', href: '/design-system/components/number-stepper', note: 'Cantidades con +/- touch-friendly' },
  { name: 'RangeSlider', href: '/design-system/components/range-slider', note: 'Rangos numéricos visuales' },
];

const FEEDBACK = [
  { name: 'Alert', href: '/design-system/components/alert', note: 'Inline success / info / warning / error' },
  { name: 'Dialog', href: '/design-system/components/dialog', note: 'Confirmaciones, formularios modales' },
  { name: 'Badge', href: '/design-system/components/badge', note: 'Estados compactos en tablas y cards' },
];

export default function DesignSystemFormsFeedbackPage() {
  return (
    <div className="space-y-10">
      <DsPageHeader
        kicker="Patrones"
        title="Formularios y feedback"
        description="Composición de inputs @kai/ui con validación Zod en Server Actions. Feedback inline (Alert) antes que toast genérico; Dialog para acciones destructivas."
      />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Flujo recomendado (admin)</h2>
        <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
          <li>Schema Zod en la feature (dominio), no en @kai/ui.</li>
          <li>Server Action valida y retorna errores por campo → TextField error/helperText.</li>
          <li>Éxito: Alert success arriba del form o redirect; error global: Alert error.</li>
          <li>Eliminar / irreversible: DeleteDialog o Dialog con confirmación explícita.</li>
          <li>No fetch desde hooks de UI — solo Server Actions con Bearer al backend.</li>
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Inputs</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {INPUTS.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className="block rounded-lg border border-border px-4 py-3 transition-colors hover:bg-neutral/40"
              >
                <span className="font-medium text-foreground">{item.name}</span>
                <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Feedback</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {FEEDBACK.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className="block rounded-lg border border-border px-4 py-3 transition-colors hover:bg-neutral/40"
              >
                <span className="font-medium text-foreground">{item.name}</span>
                <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-sm text-muted-foreground">
        Colores semánticos:{' '}
        <Link href="/design-system/foundations/colors" className="font-medium text-primary hover:underline">
          Foundations → Colores
        </Link>
      </p>
    </div>
  );
}
