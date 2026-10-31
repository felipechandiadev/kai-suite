"use client";

import { clearKdsSession } from "@/lib/app-session";
import { kdsLogoutAction } from "@/features/dining-kds/actions/kds.action";

let redirecting = false;

export function isUnauthorizedKdsFailure(error: unknown): boolean {
  if (
    error != null &&
    typeof error === "object" &&
    "status" in error &&
    Number((error as { status?: unknown }).status) === 401
  ) {
    return true;
  }
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const m = message.toLowerCase();
  return (
    m.includes("sesión inválida") ||
    m.includes("sesion invalida") ||
    m.includes("no autenticado") ||
    m.includes("sesión expirada") ||
    m.includes("token de autenticación") ||
    m.includes("unauthorized") ||
    m.includes("http 401")
  );
}

/**
 * Si el error indica sesión inválida, limpia la sesión KDS y va a `/login`.
 * @returns true si se inició el redirect (el caller no debe seguir actualizando UI).
 */
export function redirectToLoginIfUnauthorized(error: unknown): boolean {
  if (!isUnauthorizedKdsFailure(error)) return false;
  if (redirecting) return true;
  redirecting = true;
  clearKdsSession();
  if (typeof window !== "undefined") {
    // Borra cookies httpOnly (si quedaron) antes de ir a login.
    void kdsLogoutAction()
      .catch(() => undefined)
      .finally(() => window.location.replace("/login"));
  }
  return true;
}
