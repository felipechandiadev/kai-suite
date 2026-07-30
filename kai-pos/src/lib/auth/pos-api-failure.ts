"use client";

import { signOutSessionExpired } from "./sign-out-session-expired";

export type PosApiFailureShape = {
  success?: boolean;
  message?: string;
  statusCode?: number;
};

export function isUnauthorizedApiFailure(result: PosApiFailureShape): boolean {
  if (result.success !== false) return false;
  if (result.statusCode === 401) return true;
  const m = (result.message ?? "").toString().toLowerCase();
  return (
    m.includes("sesión inválida") ||
    m.includes("sesion invalida") ||
    m.includes("no autenticado") ||
    m.includes("token de autenticación") ||
    m.includes("unauthorized") ||
    m.includes("http 401")
  );
}

/**
 * Si la respuesta del backend indica sesión inválida, cierra sesión y redirige a `/`.
 * @returns true si se inició el cierre de sesión (el caller debe dejar de actualizar UI).
 */
export function redirectToLoginIfUnauthorized(result: PosApiFailureShape): boolean {
  if (!isUnauthorizedApiFailure(result)) return false;
  signOutSessionExpired();
  return true;
}
