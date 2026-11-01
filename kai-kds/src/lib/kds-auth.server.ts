import { cookies } from "next/headers";
import { diningRefresh, type DiningAuthContext, type DiningTokens } from "./backend-api";
import {
  KDS_ACCESS_COOKIE,
  KDS_REFRESH_COOKIE,
  decodeKdsToken,
  kdsCookieOptions,
  needsRefresh,
} from "./kds-auth-cookies";

/** Solo desde Server Actions / Route Handlers (escriben cookies). */
export async function setKdsAuthCookies(tokens: DiningTokens): Promise<void> {
  const jar = await cookies();
  jar.set(KDS_ACCESS_COOKIE, tokens.accessToken, kdsCookieOptions(tokens.expiresIn));
  jar.set(KDS_REFRESH_COOKIE, tokens.refreshToken, kdsCookieOptions(tokens.refreshExpiresIn));
}

export async function clearKdsAuthCookies(): Promise<void> {
  const jar = await cookies();
  jar.delete(KDS_ACCESS_COOKIE);
  jar.delete(KDS_REFRESH_COOKIE);
}

/**
 * Identidad de la estación tomada de la cookie httpOnly (nunca del cuerpo de la acción).
 * Refresca el access token si caducó y hay refresh token.
 */
export async function requireKdsAuth(): Promise<DiningAuthContext> {
  const jar = await cookies();
  let access = jar.get(KDS_ACCESS_COOKIE)?.value;

  if (needsRefresh(access)) {
    const refresh = jar.get(KDS_REFRESH_COOKIE)?.value;
    if (!refresh) throw new Error("No autenticado. Inicia sesión nuevamente.");
    try {
      const tokens = await diningRefresh(refresh);
      await setKdsAuthCookies(tokens);
      access = tokens.accessToken;
    } catch {
      await clearKdsAuthCookies().catch(() => undefined);
      throw new Error("Sesión expirada. Inicia sesión nuevamente.");
    }
  }

  const claims = decodeKdsToken(access);
  if (!access || !claims?.cid) {
    throw new Error("No autenticado. Inicia sesión nuevamente.");
  }
  return { accessToken: access, companyId: claims.cid };
}
