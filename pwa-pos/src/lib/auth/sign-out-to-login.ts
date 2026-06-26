"use client";

import { signOut } from "next-auth/react";

let inFlight: Promise<void> | null = null;

/**
 * Cierra sesión NextAuth y vuelve al login en el mismo origen del navegador
 * (p. ej. http://192.168.x.x:4032). Evita redirigir a localhost cuando NEXTAUTH_URL
 * apunta al host de desarrollo pero la PWA se abre desde otra tablet en la LAN.
 */
export async function signOutToLogin(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await signOut({ redirect: false });
  } catch {
    // Si falla el endpoint de NextAuth, igual forzamos navegación al login.
  }
  window.location.assign("/");
}

/** Idempotente: varios 401 simultáneos no disparan varios sign-out. */
export function signOutToLoginOnce(): void {
  if (typeof window === "undefined") return;
  if (inFlight) return;
  inFlight = signOutToLogin().finally(() => {
    inFlight = null;
  });
}
