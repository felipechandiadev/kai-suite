"use client";

import { signOutSessionExpired } from "./sign-out-session-expired";

/** Si la respuesta es 401 / sesión inválida, cierra sesión y redirige al login. */
export function handleUnauthorizedClient(result: {
  unauthorized?: boolean;
}): boolean {
  if (!result.unauthorized) {
    return false;
  }
  signOutSessionExpired();
  return true;
}
