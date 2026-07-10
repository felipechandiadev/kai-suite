import { DotProgress } from '@kai/ui';

/**
 * UI por defecto mientras carga un segmento bajo (app) (RSC + navegación).
 * Para una ruta concreta, añade `loading.tsx` en esa carpeta (p. ej. `settings/branches/loading.tsx`).
 */
export default function AppSegmentLoading() {
  return (
    <div
      className="flex min-h-[50vh] w-full items-center justify-center"
      role="status"
      aria-label="Cargando"
    >
      <DotProgress size={20} gap={10} />
    </div>
  );
}
