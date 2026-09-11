"use client";

import { signOutSessionExpired } from "./sign-out-session-expired";

export function handleUnauthorizedClient(result: { unauthorized?: boolean }): boolean {
  if (!result.unauthorized) return false;
  signOutSessionExpired();
  return true;
}
