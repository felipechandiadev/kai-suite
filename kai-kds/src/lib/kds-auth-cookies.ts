/**
 * Helpers puros (sin next/headers) para la sesión firmada de KDS (mismo patrón que kai-waiter).
 * Los tokens viven solo en cookies httpOnly; nunca en localStorage.
 */
export const KDS_ACCESS_COOKIE = "kai_kds_at";
export const KDS_REFRESH_COOKIE = "kai_kds_rt";

export type KdsCookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
};

/** `secure` en producción; `KDS_COOKIE_SECURE=true|false` lo fuerza (p. ej. LAN http). */
export function kdsCookieSecure(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const raw = env.KDS_COOKIE_SECURE?.trim().toLowerCase();
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return env.NODE_ENV === "production";
}

export function kdsCookieOptions(
  maxAgeSeconds: number,
  env: Record<string, string | undefined> = process.env,
): KdsCookieOptions {
  return {
    httpOnly: true,
    secure: kdsCookieSecure(env),
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(0, Math.floor(maxAgeSeconds)),
  };
}

export type KdsTokenClaims = {
  sub: string;
  cid: string | null;
  exp: number;
};

/**
 * Decodifica el payload SIN verificar la firma (la verifica kai-core).
 * Solo se usa para saber la empresa del token y si hay que refrescar.
 */
export function decodeKdsToken(token: string | undefined | null): KdsTokenClaims | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const json = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Record<
      string,
      unknown
    >;
    if (typeof json.sub !== "string" || typeof json.exp !== "number") return null;
    return {
      sub: json.sub,
      cid: typeof json.cid === "string" ? json.cid : null,
      exp: json.exp,
    };
  } catch {
    return null;
  }
}

/** true si el token falta, es ilegible o caduca en menos de `skewSeconds`. */
export function needsRefresh(
  token: string | undefined | null,
  nowSeconds = Math.floor(Date.now() / 1000),
  skewSeconds = 30,
): boolean {
  const claims = decodeKdsToken(token);
  return !claims || claims.exp - skewSeconds <= nowSeconds;
}
