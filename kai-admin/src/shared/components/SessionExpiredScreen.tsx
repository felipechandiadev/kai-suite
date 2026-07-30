"use client";

import { useEffect, useState } from "react";
import { Button } from "@kai/ui";
import { signOutSessionExpired } from "@/lib/auth/sign-out-session-expired";

type SessionExpiredScreenProps = {
  /** Si true, cierra sesión y redirige al login al montar. */
  autoRedirect?: boolean;
  /** Callback opcional de «Reintentar» (p. ej. reset del error boundary). */
  onRetry?: () => void;
};

/**
 * Pantalla amigable cuando el backend responde 401 («Sesión inválida»).
 * Cierra NextAuth y lleva a `/` (login).
 */
export function SessionExpiredScreen({
  autoRedirect = true,
  onRetry,
}: SessionExpiredScreenProps) {
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!autoRedirect) {
      return;
    }
    signOutSessionExpired();
  }, [autoRedirect]);

  const goToLogin = () => {
    setSigningOut(true);
    signOutSessionExpired();
  };

  return (
    <div
      className="flex min-h-[70vh] w-full flex-1 items-center justify-center px-6 py-10"
      data-test-id="session-expired-screen"
    >
      <div className="w-full max-w-md rounded-xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
            stroke="currentColor"
            className="h-6 w-6 animate-pulse"
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
          Por seguridad debes volver a iniciar sesión.{" "}
          {autoRedirect ? "Redirigiendo al login…" : null}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            variant="primary"
            loading={signingOut}
            disabled={signingOut}
            onClick={goToLogin}
            data-test-id="session-expired-login-button"
          >
            Ir al login
          </Button>
          {onRetry ? (
            <Button variant="outlined" onClick={onRetry} disabled={signingOut}>
              Reintentar
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
