'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@kai/ui';
import { isUnauthorizedSessionError } from '@/lib/auth/unauthorized-session';
import { SessionExpiredScreen } from '@/shared/components/SessionExpiredScreen';

type ErrorBoundaryProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Error boundary del segmento `(app)`. Reemplaza el children del shell
 * cuando un Server o Client Component lanza una excepción durante el
 * render, manteniendo el `AppShellLayoutClient` (sidebar, topbar) montado.
 *
 * 401 / sesión inválida → pantalla en español + cierre de sesión y login.
 */
export default function AppGroupError({ error, reset }: ErrorBoundaryProps) {
  const [showDetails, setShowDetails] = useState(false);

  const isUnauthorized = useMemo(() => isUnauthorizedSessionError(error), [error]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[AppGroupError]', error);
    }
  }, [error]);

  if (isUnauthorized) {
    return <SessionExpiredScreen autoRedirect onRetry={reset} />;
  }

  return (
    <div className="flex min-h-[70vh] w-full items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
            stroke="currentColor"
            className="h-6 w-6"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 15.75h.008v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-semibold text-slate-900">
          Algo salió mal
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-slate-600">
          Ocurrió un error inesperado al cargar esta sección. Puedes
          intentar nuevamente; si el problema persiste, contacta al
          equipo de soporte.
        </p>

        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="primary" onClick={() => reset()}>
            Reintentar
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/';
              }
            }}
          >
            Ir al inicio
          </Button>
        </div>

        <button
          type="button"
          className="text-xs text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
          onClick={() => setShowDetails((v) => !v)}
        >
          {showDetails ? 'Ocultar detalles técnicos' : 'Ver detalles técnicos'}
        </button>
        {showDetails ? (
          <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-100 p-3 text-left text-xs text-slate-700">
            {error.message || 'Error desconocido'}
            {error.digest ? `\n\nDigest: ${error.digest}` : ''}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
