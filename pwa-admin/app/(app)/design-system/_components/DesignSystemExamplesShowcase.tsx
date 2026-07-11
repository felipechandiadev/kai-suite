'use client';

import Link from 'next/link';
import {
  Alert,
  Badge,
  Button,
  Card,
  IconButton,
  StatisticsCard,
  Switch,
  TextField,
} from '@kai/ui';
import ExampleBlock from './ExampleBlock';

const EXAMPLE_NAV = [
  { id: 'kpi-dashboard', label: 'Panel KPI' },
  { id: 'entity-card', label: 'Entidad ERP' },
  { id: 'catalog-grid', label: 'Catálogo' },
  { id: 'form-card', label: 'Formulario' },
  { id: 'inbox-list', label: 'Bandeja' },
  { id: 'feedback-stack', label: 'Feedback' },
  { id: 'settings-row', label: 'Ajustes' },
  { id: 'empty-state', label: 'Estado vacío' },
];

function MediaPlaceholder({ label, tone = 'primary' }: { label: string; tone?: 'primary' | 'secondary' | 'neutral' }) {
  const bg =
    tone === 'secondary'
      ? 'color-mix(in srgb, var(--color-secondary) 22%, var(--color-background))'
      : tone === 'neutral'
        ? 'var(--color-neutral)'
        : 'color-mix(in srgb, var(--color-primary) 18%, var(--color-background))';

  return (
    <div
      className="flex h-28 w-full items-center justify-center text-sm font-medium text-muted-foreground"
      style={{ backgroundColor: bg }}
    >
      {label}
    </div>
  );
}

export default function DesignSystemExamplesShowcase() {
  return (
    <div className="space-y-12">
      <nav className="rounded-lg border border-border bg-neutral/30 p-4" aria-label="Ejemplos en esta página">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saltar a ejemplo</p>
        <ul className="flex flex-wrap gap-2">
          {EXAMPLE_NAV.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="inline-block rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-neutral/50"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <ExampleBlock
        id="kpi-dashboard"
        pattern="Dashboard · StatisticsCard"
        title="Panel de resumen con KPIs"
        description="Fila de métricas para Panel o cabecera de módulo. StatisticsCard usa tokens semánticos (primary, success, info, warning) — no colores sueltos por KPI."
      >
        <Alert variant="info" className="mb-4">
          <span className="text-sm">Ventas del día · actualizado hace 5 min</span>
        </Alert>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatisticsCard label="Ventas hoy" value="$ 842.500" hint="+12% vs ayer" tone="primary" />
          <StatisticsCard label="Tickets" value="47" hint="3 pendientes de sync" tone="info" />
          <StatisticsCard label="Margen" value="38,2%" hint="Meta 35%" tone="success" />
          <StatisticsCard label="Devoluciones" value="2" hint="Revisar antes del cierre" tone="warning" />
        </div>
      </ExampleBlock>

      <ExampleBlock
        id="entity-card"
        pattern="Detalle · Card + Badge + acciones"
        title="Tarjeta de entidad con estado y acciones"
        description="Patrón típico en detalle de producto, cliente o documento: título, subtítulo, badge de estado, cuerpo y acciones primarias/secundarias."
      >
        <Card
          title="Factura F-004821"
          subtitle="Cliente · Distribuidora Norte SPA"
          headerEnd={<Badge variant="success-outlined">Pagada</Badge>}
          content={
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Emisión</dt>
                <dd className="font-medium text-foreground">08 jul 2026</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Total</dt>
                <dd className="font-medium text-foreground">$ 1.245.900</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Vendedor</dt>
                <dd className="font-medium text-foreground">María González</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Sucursal</dt>
                <dd className="font-medium text-foreground">Casa matriz</dd>
              </div>
            </dl>
          }
          actions={[
            { id: 'pdf', icon: 'FileText', ariaLabel: 'Ver PDF', onClick: () => undefined },
            { id: 'mail', icon: 'Mail', ariaLabel: 'Enviar por correo', onClick: () => undefined },
            { id: 'print', label: 'Imprimir', variant: 'outlined', onClick: () => undefined },
            { id: 'open', label: 'Abrir detalle', variant: 'primary', onClick: () => undefined },
          ]}
        />
      </ExampleBlock>

      <ExampleBlock
        id="catalog-grid"
        pattern="Collection · Card con media"
        title="Grilla de catálogo (CollectionPageLayout)"
        description="Tres cards con media a ancho completo — mismo aspecto que contentItems en CollectionPageLayout. Hover en card clickable opcional."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card
            media={<MediaPlaceholder label="Imagen producto" tone="neutral" />}
            title="Polera algodón premium"
            subtitle="SKU · POL-001 · Stock 24"
            content={<p className="text-sm text-muted-foreground">$ 12.990 · Categoría Ropa</p>}
            actions={[
              { id: 'edit', icon: 'Pencil', ariaLabel: 'Editar', onClick: () => undefined },
              { id: 'view', label: 'Ver', variant: 'primary', onClick: () => undefined },
            ]}
          />
          <Card
            media={<MediaPlaceholder label="Imagen producto" tone="primary" />}
            title="Jean slim fit"
            subtitle="SKU · JEA-042 · Stock 8"
            content={<p className="text-sm text-muted-foreground">$ 29.990 · Categoría Ropa</p>}
            headerEnd={<Badge variant="warning-outlined">Bajo stock</Badge>}
            actions={[
              { id: 'edit', icon: 'Pencil', ariaLabel: 'Editar', onClick: () => undefined },
              { id: 'view', label: 'Ver', variant: 'primary', onClick: () => undefined },
            ]}
          />
          <Card
            media={<MediaPlaceholder label="Imagen producto" tone="secondary" />}
            title="Zapatilla running"
            subtitle="SKU · ZAP-118 · Stock 0"
            content={<p className="text-sm text-muted-foreground">$ 54.990 · Categoría Calzado</p>}
            headerEnd={<Badge variant="error-outlined">Sin stock</Badge>}
            actions={[
              { id: 'edit', icon: 'Pencil', ariaLabel: 'Editar', onClick: () => undefined },
              { id: 'view', label: 'Ver', variant: 'outlined', onClick: () => undefined },
            ]}
          />
        </div>
      </ExampleBlock>

      <ExampleBlock
        id="form-card"
        pattern="Formulario · Card + inputs + Button"
        title="Formulario dentro de card"
        description="BasicPageLayout + card para agrupar campos. Validación vía Server Action; Alert arriba para error global."
      >
        <div className="mx-auto max-w-lg space-y-4">
          <Alert variant="warning">
            <span className="text-sm">Complete los campos obligatorios antes de guardar.</span>
          </Alert>
          <Card
            title="Nuevo proveedor"
            subtitle="Datos mínimos para alta en compras"
            content={
              <div className="space-y-4">
                <TextField label="Razón social" placeholder="Ej. Comercial Andes Ltda." required />
                <TextField label="RUT" placeholder="76.123.456-7" />
                <TextField label="Email contacto" placeholder="compras@empresa.cl" type="email" />
              </div>
            }
            actions={[
              { id: 'cancel', label: 'Cancelar', variant: 'outlined', onClick: () => undefined },
              { id: 'save', label: 'Guardar proveedor', variant: 'primary', onClick: () => undefined },
            ]}
          />
        </div>
      </ExampleBlock>

      <ExampleBlock
        id="inbox-list"
        pattern="Lista · Cards compactas"
        title="Bandeja de tareas / notificaciones"
        description="Varias cards en stack con acciones icono — útil para aprobaciones, alertas operativas o cola de sync."
      >
        <ul className="space-y-3">
          {[
            {
              title: 'Aprobar orden de compra #OC-882',
              subtitle: 'Solicitada por Juan · $ 450.000',
              badge: 'Pendiente' as const,
            },
            {
              title: 'Sincronizar catálogo eShop',
              subtitle: '12 productos con conflicto de precio',
              badge: 'Acción requerida' as const,
            },
            {
              title: 'Cierre de caja POS · Terminal 2',
              subtitle: 'Diferencia $ 3.200 · revisar arqueo',
              badge: 'Urgente' as const,
            },
          ].map((item, index) => (
            <li key={item.title}>
              <Card
                title={item.title}
                subtitle={item.subtitle}
                headerEnd={
                  <Badge
                    variant={
                      index === 2 ? 'error-outlined' : index === 1 ? 'warning-outlined' : 'info-outlined'
                    }
                  >
                    {item.badge}
                  </Badge>
                }
                actions={[
                  { id: 'dismiss', icon: 'X', ariaLabel: 'Descartar', onClick: () => undefined },
                  { id: 'open', icon: 'ChevronRight', ariaLabel: 'Abrir', onClick: () => undefined },
                ]}
                actionsVariant="embedded"
              />
            </li>
          ))}
        </ul>
      </ExampleBlock>

      <ExampleBlock
        id="feedback-stack"
        pattern="Feedback · Alert + Badge"
        title="Estados de feedback compuestos"
        description="Combinación de Alert inline y badges en contexto — reglas de color en Foundations → Colores."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <Alert variant="success">
              <span className="text-sm">Producto guardado correctamente.</span>
            </Alert>
            <Alert variant="info">
              <span className="text-sm">La sincronización continuará en segundo plano.</span>
            </Alert>
            <Alert variant="warning">
              <span className="text-sm">Stock bajo en 3 variantes.</span>
            </Alert>
            <Alert variant="error">
              <span className="text-sm">No se pudo conectar con el backend.</span>
            </Alert>
          </div>
          <Card
            title="Etiquetas de estado"
            content={
              <div className="flex flex-wrap gap-2">
                <Badge variant="primary">Activo</Badge>
                <Badge variant="secondary">Promoción</Badge>
                <Badge variant="success-outlined">OK</Badge>
                <Badge variant="warning-outlined">Pendiente</Badge>
                <Badge variant="error-outlined">Error</Badge>
                <Badge variant="info-outlined">Info</Badge>
              </div>
            }
          />
        </div>
      </ExampleBlock>

      <ExampleBlock
        id="settings-row"
        pattern="Ajustes · fila con Switch"
        title="Fila de configuración"
        description="Card sin media: título, descripción y control a la derecha — patrón común en Configuración."
      >
        <ul className="divide-y divide-border rounded-lg border border-border">
          {[
            { label: 'Notificaciones por email', hint: 'Alertas de stock y ventas', defaultOn: true },
            { label: 'Modo joyería', hint: 'Precios por gramo y metales', defaultOn: false },
            { label: 'Multi-sucursal', hint: 'Selector de sucursal en POS', defaultOn: true },
          ].map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{row.label}</p>
                <p className="text-xs text-muted-foreground">{row.hint}</p>
              </div>
              <Switch checked={row.defaultOn} />
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="primary">Guardar cambios</Button>
          <Button variant="outlined">Restablecer</Button>
          <IconButton icon="HelpCircle" variant="action" aria-label="Ayuda" />
        </div>
      </ExampleBlock>

      <ExampleBlock
        id="empty-state"
        pattern="Vacío · Card + CTA"
        title="Estado vacío con llamada a acción"
        description="Cuando contentItems=[] o un listado no tiene datos — mensaje centrado y botón primary."
      >
        <Card
          className="mx-auto max-w-md text-center"
          content={
            <div className="flex flex-col items-center gap-3 py-6">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-neutral) 80%, var(--color-background))',
                }}
              >
                <span className="text-2xl text-muted-foreground" aria-hidden>
                  ○
                </span>
              </div>
              <h3 className="text-base font-semibold text-foreground">No hay productos todavía</h3>
              <p className="max-w-xs text-sm text-muted-foreground">
                Cree el primero desde el catálogo o importe una planilla para poblar la grilla.
              </p>
              <Button variant="primary">Agregar producto</Button>
            </div>
          }
        />
      </ExampleBlock>

      <section className="rounded-lg border border-dashed border-border bg-neutral/30 p-5 text-sm text-muted-foreground">
        <h2 className="text-base font-semibold text-foreground">Siguiente paso</h2>
        <p className="mt-2 leading-relaxed">
          Cada primitivo tiene su showcase interactivo. Use esta página para ver composiciones; use{' '}
          <Link href="/design-system/components" className="font-medium text-primary hover:underline">
            Componentes
          </Link>{' '}
          y{' '}
          <Link href="/design-system/patterns" className="font-medium text-primary hover:underline">
            Patrones
          </Link>{' '}
          para profundizar.
        </p>
      </section>
    </div>
  );
}
