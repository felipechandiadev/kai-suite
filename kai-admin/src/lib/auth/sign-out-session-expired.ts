"use client";

import { signOut } from "next-auth/react";
import { isUnauthorizedErrorMessage } from "@/lib/auth/unauthorized-session";

let inFlight: Promise<void> | null = null;

/**
 * Cierra sesión NextAuth y envía al login (`/`). Idempotente / con debounce
 * para no disparar varias veces si WS y HTTP fallan a la vez.
 */
export function signOutSessionExpired(): void {
  if (typeof window === "undefined") {
    return;
  }
  if (inFlight) {
    return;
  }
  inFlight = (async () => {
    try {
      await signOut({ redirect: false });
    } catch {
      // Si falla el endpoint de NextAuth, igual forzamos navegación al login.
    }
    window.location.assign("/");
  })().finally(() => {
    inFlight = null;
  });
}

export function isUnauthorizedResponse(res: Response): boolean {
  return res.status === 401;
}

export { isUnauthorizedErrorMessage };
