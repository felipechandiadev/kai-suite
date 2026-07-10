'use client';

import { Card, StatisticsCard } from '@kai/ui';

export default function CardsShowcasePage() {
  return (
    <div className="p-8 space-y-12">
      <div>
        <h1 className="text-3xl font-bold mb-2">Cards</h1>
        <p className="text-gray-600">
          Contenedor <code className="text-sm">Card</code> (props: <code>media</code>, <code>title</code>, <code>subtitle</code>,{' '}
          <code>headerEnd</code>, <code>content</code> / <code>children</code>, <code>actions</code> con <code>onClick</code>) y al final{' '}
          <code className="text-sm">StatisticsCard</code>.
        </p>
      </div>

      {/* Basic Card: solo children (legado) */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Basic Card</h2>
        <Card>
          <h3 className="text-lg font-semibold mb-2">Card Title</h3>
          <p className="text-gray-600">
            This is a basic card component. It provides a container with subtle styling and shadow effects.
          </p>
        </Card>
      </div>

      {/* media + title + content vía props */}
      <div>
        <h2 className="text-2xl font-semibold">Cards with media header</h2>
        <p className="text-sm text-gray-600 mb-4 mt-1">
          Usando <code className="text-xs">media</code>, <code className="text-xs">title</code> y <code className="text-xs">content</code>. La cabecera visual va a
          ancho completo; título bajo <code className="text-xs">media</code> sin borde inferior (solo el cuerpo y el pie de acciones conservan su separación).
        </p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card
            media={
              <div
                className="flex h-24 w-full shrink-0 items-center justify-center bg-blue-100"
                data-test-id="card-media-header-zone"
              >
                <span className="text-2xl" aria-hidden>
                  📊
                </span>
              </div>
            }
            title="Analytics"
            content={
              <p className="text-sm text-gray-600">
                Track and monitor key metrics and performance indicators.
              </p>
            }
          />

          <Card
            media={
              <div className="flex h-24 w-full shrink-0 items-center justify-center bg-green-100">
                <span className="text-2xl" aria-hidden>
                  ✅
                </span>
              </div>
            }
            title="Tasks"
            content={
              <p className="text-sm text-gray-600">
                Manage and track your tasks with ease and efficiency.
              </p>
            }
          />

          <Card
            media={
              <div className="flex h-24 w-full shrink-0 items-center justify-center bg-purple-100">
                <span className="text-2xl" aria-hidden>
                  ⚙️
                </span>
              </div>
            }
            title="Settings"
            content={
              <p className="text-sm text-gray-600">
                Configure and customize your application preferences.
              </p>
            }
          />
        </div>
      </div>

      {/* title, subtitle, headerEnd, content, actions con callbacks */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Card with Actions</h2>
        <Card
          title="Featured Project"
          subtitle="Latest updates and information"
          headerEnd={
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs text-green-800">Active</span>
          }
          content={
            <p className="text-gray-700">
              This is a featured project card with additional information and action buttons.
            </p>
          }
          actions={[
            {
              id: 'edit',
              label: 'Edit',
              variant: 'outlined',
              onClick: () => {
                console.info('Edit');
              },
            },
            {
              id: 'view',
              label: 'View details',
              variant: 'primary',
              onClick: () => {
                console.info('View details');
              },
            },
          ]}
        />
      </div>

      {/* Acciones: IconButton (action fijo) + opcional mezclar con Button */}
      <div>
        <h2 className="text-2xl font-semibold mb-2">Card with actions (IconButton)</h2>
        <p className="mb-4 text-sm text-gray-600">
          En <code>actions</code>, las entradas con <code>icon</code> + <code>ariaLabel</code> se renderizan como <code>IconButton</code> (siempre{' '}
          <code>action</code> y <code>size=sm</code> — norma del proyecto). Se pueden mezclar con acciones de texto.
        </p>
        <Card
          title="Inbox item"
          subtitle="Quick actions as icons"
          content={
            <p className="text-sm text-gray-600">
              Use share, favorite o eliminar. Los callbacks viven en cada acción.
            </p>
          }
          actions={[
            {
              id: 'share',
              icon: 'Share2',
              ariaLabel: 'Compartir',
              onClick: () => {
                console.info('Share');
              },
            },
            {
              id: 'fav',
              icon: 'Star',
              ariaLabel: 'Marcar favorito',
              onClick: () => {
                console.info('Favorite');
              },
            },
            {
              id: 'del',
              icon: 'Trash2',
              ariaLabel: 'Eliminar',
              onClick: () => {
                console.info('Delete');
              },
            },
            {
              id: 'done',
              label: 'Listo',
              variant: 'primary',
              onClick: () => {
                console.info('Done');
              },
            },
          ]}
        />
      </div>

      {/* Contenedor base Card — API */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Contenedor: Card (API)</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>
            Import: <code className="text-sm">Card</code> desde <code className="text-sm">@kai/ui</code>
          </li>
          <li>
            <strong>Modo compuesto</strong> (cualquiera de estos prop activa el layout estructurado): <code>media</code>, <code>title</code>,{' '}
            <code>subtitle</code>, <code>headerEnd</code>, <code>content</code> (o <code>children</code> como cuerpo), <code>actions</code>.
          </li>
          <li>
            <code>actions</code>: <code>CardAction[]</code> — botón de texto (<code>label</code> + <code>onClick</code>) o icono (<code>icon</code> + <code>ariaLabel</code> +{' '}
            <code>onClick</code>).
          </li>
          <li>
            <strong>IconButton en cards</strong> (p. ej. vía <code>actions</code> con <code>icon</code>): siempre <code>variant=&quot;action&quot;</code> (aplicado en <code>Card</code>).
            Manualmente en composiciones custom, mismo criterio — ver instrucciones webadmin.
          </li>
          <li>
            <strong>Modo legado</strong>: solo <code>children</code> → <code className="text-sm">p-4</code> y mismo borde sombra que el Dialog
          </li>
        </ul>
      </div>

      <section
        className="border-t border-border/70 pt-12"
        aria-labelledby="showcase-statistics-card"
        data-test-id="showcase-statistics-card-section"
      >
        <h2 id="showcase-statistics-card" className="text-2xl font-semibold">
          StatisticsCard
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Componente <strong>independiente</strong> (compone <code className="text-xs">Card</code> con solo <code>children</code>) para KPIs. Import:{' '}
          <code className="text-sm">StatisticsCard</code> desde <code className="text-sm">@kai/ui</code>
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatisticsCard
            label="Total Users"
            value="1,234"
            hint="+12% from last month"
            tone="primary"
            data-test-id="showcase-stat-total-users"
          />
          <StatisticsCard
            label="Revenue"
            value="$45,678"
            hint="+8% from last month"
            tone="success"
            data-test-id="showcase-stat-revenue"
          />
          <StatisticsCard
            label="Orders"
            value="567"
            hint="+5% from last month"
            tone="info"
            data-test-id="showcase-stat-orders"
          />
          <StatisticsCard
            label="Conversion"
            value="3.45%"
            hint="+0.2% from last month"
            tone="warning"
            data-test-id="showcase-stat-conversion"
          />
        </div>
      </section>
    </div>
  );
}
