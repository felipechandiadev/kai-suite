'use client';

import { IconButton } from '@kai/ui';

export default function IconButtonPage() {
  return (
    <div className="p-8 space-y-12">
      <div>
        <h1 className="text-3xl font-bold mb-2">Icon Button Component Showcase</h1>
        <p className="text-muted-foreground">
          Variantes de <code>IconButton</code> con iconos lucide-react. Default: <code>action</code>.
        </p>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Variantes</h2>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Action</p>
            <p className="text-xs text-muted-foreground">Toolbars, grids</p>
            <IconButton icon="Pencil" variant="action" ariaLabel="Editar" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Primary</p>
            <IconButton icon="Heart" variant="primary" ariaLabel="Favorito" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Secondary</p>
            <IconButton icon="Star" variant="secondary" ariaLabel="Destacar" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Primary circle</p>
            <p className="text-xs text-muted-foreground">Primary, circular</p>
            <IconButton icon="Plus" variant="primaryCircle" ariaLabel="Añadir" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Secondary circle</p>
            <p className="text-xs text-muted-foreground">Secondary, circular</p>
            <IconButton icon="Send" variant="secondaryCircle" ariaLabel="Enviar" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Text</p>
            <p className="text-xs text-muted-foreground">Primary sin borde, hover → active</p>
            <IconButton icon="Settings" variant="text" ariaLabel="Ajustes" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Outlined</p>
            <IconButton icon="Plus" variant="outlined" ariaLabel="Añadir" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Neutral</p>
            <p className="text-xs text-muted-foreground">Discreto, hover suave</p>
            <IconButton icon="X" variant="neutral" ariaLabel="Cerrar" />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Tamaños</h2>
        <div className="flex flex-wrap items-center gap-4">
          {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => (
            <div key={size} className="space-y-2">
              <p className="text-sm font-medium uppercase">{size}</p>
              <IconButton icon="Edit" size={size} variant="action" ariaLabel={`Tamaño ${size}`} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Iconos comunes</h2>
        <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
          {['Home', 'Settings', 'User', 'Lock', 'Eye', 'EyeOff', 'Trash2', 'Download', 'Upload', 'Copy', 'Check', 'AlertCircle'].map((icon) => (
            <div key={icon} className="flex flex-col items-center gap-2">
              <IconButton icon={icon as any} variant="action" ariaLabel={icon} />
              <p className="text-xs text-muted-foreground text-center">{icon}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Estados</h2>
        <div className="flex flex-wrap gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Disabled</p>
            <IconButton icon="Save" disabled ariaLabel="Guardar" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Loading</p>
            <IconButton icon="Loader" isLoading ariaLabel="Cargando" />
          </div>
        </div>
      </div>
    </div>
  );
}
