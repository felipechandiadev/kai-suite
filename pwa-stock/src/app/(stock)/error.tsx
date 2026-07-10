"use client";

import { useEffect, useMemo } from "react";
import { signOut } from "next-auth/react";
import { Alert, Button } from "@kai/ui";

type StockErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

function isUnauthorizedError(error: Error & { digest?: string }): boolean {
  const lower = `${error.message} ${error.digest ?? ""}`.toLowerCase();
  return (
    lower.includes("sesión inválida") ||
    lower.includes("sesion invalida") ||
    lower.includes("401") ||
    lower.includes("unauthorized") ||
    lower.includes("token de autenticación") ||
    lower.includes("token de autenticacion")
  );
}

export default function StockError({ error, reset }: StockErrorProps) {
  const isUnauthorized = useMemo(() => isUnauthorizedError(error), [error]);

  useEffect(() => {
    if (!isUnauthorized) {
      return;
    }
    void signOut({ callbackUrl: "/", redirect: true }).catch(() => {
      window.location.assign("/");
    });
  }, [isUnauthorized]);

  if (isUnauthorized) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <Alert variant="warning">Tu sesión expiró. Redirigiendo al login…</Alert>
        <Button
          variant="primary"
          onClick={() => void signOut({ callbackUrl: "/", redirect: true })}
        >
          Ir al login
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-8">
      <Alert variant="error">{error.message || "Ocurrió un error inesperado."}</Alert>
      <Button variant="secondary" onClick={() => reset()}>
        Reintentar
      </Button>
    </div>
  );
}
