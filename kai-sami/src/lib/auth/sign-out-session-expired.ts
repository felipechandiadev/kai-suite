"use client";

import { signOut } from "next-auth/react";

let inFlight: Promise<void> | null = null;

export function signOutSessionExpired(): void {
  if (typeof window === "undefined") return;
  if (inFlight) return;
  inFlight = (async () => {
    try {
      await signOut({ callbackUrl: "/", redirect: true });
    } catch {
      window.location.assign("/");
    } finally {
      inFlight = null;
    }
  })();
}
