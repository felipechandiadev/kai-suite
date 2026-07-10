"use client";

import { useEffect, useMemo, useState } from "react";
import { signOutToLogin } from "@/lib/auth/sign-out-to-login";
import { Button } from "@kai/ui";

type ErrorBoundaryProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Error boundary raíz del POS. Captura errores en render (Server/Client)
 * bajo el `RootLayout`, p. ej. 401 «Sesión inválida» del backend vía
 * acciones o fetch en RSC, y ofrece cerrar sesión o reintentar — mismo
 * criterio heurístico que `pwa-admin/app/(app)/error.tsx`.
 */
export default function PosRootError({ error, reset }: ErrorBoundaryProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[PosRootError]", error);
    }
  }, [error]);

  const isUnauthorized = useMemo(() => isUnauthorizedError(error), [error]);

  if (isUnauthorized) {
    return (
      <div className="flex min-h-[70vh] w-full flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
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
                d="M12 9v3.75m0 3.75h.008v.008H12V16.5Zm0-12.75c4.97 0 9 4.03 9 9s-4.03 9-9 9-9-4.03-9-9 4.03-9 9-9Z"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-amber-900">Tu sesión expiró</h2>
          <p className="mb-6 text-sm leading-relaxed text-amber-800">
            Por seguridad, debes volver a iniciar sesión para continuar usando el POS.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              variant="primary"
              loading={signingOut}
              disabled={signingOut}
              onClick={async () => {
                setSigningOut(true);
                try {
                  await signOutToLogin();
                } finally {
                  setSigningOut(false);
                }
              }}
            >
              Volver a iniciar sesión
            </Button>
            <Button variant="outlined" onClick={() => reset()} disabled={signingOut}>
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] w-full flex-1 items-center justify-center px-6 py-10">
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
        <h2 className="mb-2 text-xl font-semibold text-slate-900">Algo salió mal</h2>
        <p className="mb-6 text-sm leading-relaxed text-slate-600">
          Ocurrió un error inesperado al cargar esta sección. Puedes intentar nuevamente; si el
          problema persiste, contacta al equipo de soporte.
        </p>

        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="primary" onClick={() => reset()}>
            Reintentar
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = "/";
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
          {showDetails ? "Ocultar detalles técnicos" : "Ver detalles técnicos"}
        </button>
        {showDetails ? (
          <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap wrap-break-word rounded-md bg-slate-100 p-3 text-left text-xs text-slate-700">
            {error.message || "Error desconocido"}
            {error.digest ? `\n\nDigest: ${error.digest}` : ""}
          </pre>
        ) : null}
      </div>
    </div>
  );
}

function isUnauthorizedError(error: Error & { digest?: string }): boolean {
  const message = (error?.message ?? "").toString();
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("sesión inválida") ||
    lower.includes("sesion invalida") ||
    lower.includes("token de autenticación") ||
    lower.includes('"statuscode":401') ||
    lower.includes("http 401") ||
    lower.includes("unauthorized")
  );
}
