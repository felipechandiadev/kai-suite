"use client";

import { signOutToLoginOnce } from "./sign-out-to-login";

/** @deprecated Usar signOutToLoginOnce — mantenido por imports existentes. */
export function signOutSessionExpired(): void {
  signOutToLoginOnce();
}

export function isUnauthorizedResponse(res: Response): boolean {
  return res.status === 401;
}
