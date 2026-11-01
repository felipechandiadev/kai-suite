import { cookies } from "next/headers";
import { diningRefresh, type DiningAuthContext, type DiningTokens } from "./backend-api";
import {
  WAITER_ACCESS_COOKIE,
  WAITER_REFRESH_COOKIE,
  decodeWaiterToken,
  needsRefresh,
  waiterCookieOptions,
} from "./waiter-auth-cookies";

/** Solo desde Server Actions / Route Handlers (escriben cookies). */
export async function setWaiterAuthCookies(tokens: DiningTokens): Promise<void> {
  const jar = await cookies();
  jar.set(WAITER_ACCESS_COOKIE, tokens.accessToken, waiterCookieOptions(tokens.expiresIn));
  jar.set(
    WAITER_REFRESH_COOKIE,
    tokens.refreshToken,
    waiterCookieOptions(tokens.refreshExpiresIn),
  );
}

export async function clearWaiterAuthCookies(): Promise<void> {
  const jar = await cookies();
  jar.delete(WAITER_ACCESS_COOKIE);
  jar.delete(WAITER_REFRESH_COOKIE);
}

/**
 * Identidad del mesero tomada de la cookie httpOnly (nunca del cuerpo de la acción).
 * Refresca el access token si caducó y hay refresh token.
 */
export async function requireWaiterAuth(): Promise<DiningAuthContext> {
  const jar = await cookies();
  let access = jar.get(WAITER_ACCESS_COOKIE)?.value;

  if (needsRefresh(access)) {
    const refresh = jar.get(WAITER_REFRESH_COOKIE)?.value;
    if (!refresh) throw new Error("No autenticado. Inicia sesión nuevamente.");
    try {
      const tokens = await diningRefresh(refresh);
      await setWaiterAuthCookies(tokens);
      access = tokens.accessToken;
    } catch {
      await clearWaiterAuthCookies().catch(() => undefined);
      throw new Error("Sesión expirada. Inicia sesión nuevamente.");
    }
  }

  const claims = decodeWaiterToken(access);
  if (!access || !claims?.cid) {
    throw new Error("No autenticado. Inicia sesión nuevamente.");
  }
  return { accessToken: access, companyId: claims.cid };
}
