"use client";

import { signOut } from "next-auth/react";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import { clearOfflineSensitiveDataForPos } from "@/features/pos-offline/application/clear-offline-session-data.usecase";

let inFlight: Promise<void> | null = null;

/**
 * Cierra sesión NextAuth y vuelve al login en el mismo origen del navegador
 * (p. ej. http://192.168.x.x:5032). Evita redirigir a localhost cuando NEXTAUTH_URL
 * apunta al host de desarrollo pero la PWA se abre desde otra tablet en la LAN.
 */
export async function signOutToLogin(): Promise<void> {
  if (typeof window === "undefined") return;
  const ctx = readPosContextClient();
  if (ctx?.pointOfSaleId) {
    try {
      await clearOfflineSensitiveDataForPos(ctx.pointOfSaleId);
    } catch {
      // No bloquear logout si IndexedDB falla.
    }
  }
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
