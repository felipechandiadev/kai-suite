import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const ALLOW_ALL_TOKENS = new Set(['', '*', 'all', 'true', 'any']);

/**
 * Orígenes de red local (TV / tablet en LAN) además de la lista CORS_ORIGIN
 * (que solo suele tener localhost/127.0.0.1).
 */
export function isLanDevOrigin(origin: string): boolean {
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'http:' && protocol !== 'https:') return false;
    const h = hostname.toLowerCase();
    if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return true;
    if (h.endsWith('.local')) return true;
    const parts = h.split('.').map((p) => Number(p));
    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return false;
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    return false;
  } catch {
    return false;
  }
}

function isAllowedOrigin(origin: string, allowed: string[]): boolean {
  if (allowed.includes(origin)) return true;
  return isLanDevOrigin(origin);
}

/**
 * `origin: true` refleja el Origin de cada petición (LAN, localhost, IP, etc.).
 * Lista separada por comas = esos orígenes + LAN privada (TV/POS en red local).
 */
export function buildCorsOriginOption(
  configuredOrigin: string,
  credentials: boolean,
): CorsOptions['origin'] {
  const configured = configuredOrigin.trim();

  if (ALLOW_ALL_TOKENS.has(configured)) {
    if (credentials) {
      return (origin, callback) => {
        callback(null, origin ?? true);
      };
    }
    return true;
  }

  const allowed = configured
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (allowed.length === 0) {
    return true;
  }

  if (allowed.length === 1 && !credentials) {
    return allowed[0];
  }

  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (isAllowedOrigin(origin, allowed)) {
      callback(null, origin);
      return;
    }
    // No lanzar Error: provoca HTTP 500; rechazar CORS en silencio.
    callback(null, false);
  };
}

export function resolveCorsAllowOriginHeader(
  configuredOrigin: string,
  credentials: boolean,
  requestOrigin: string,
): string {
  const configured = configuredOrigin.trim();

  if (ALLOW_ALL_TOKENS.has(configured)) {
    if (credentials && requestOrigin) {
      return requestOrigin;
    }
    if (requestOrigin) {
      return requestOrigin;
    }
    return '*';
  }

  const allowed = configured
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (requestOrigin && isAllowedOrigin(requestOrigin, allowed)) {
    return requestOrigin;
  }
  // Sin Origin (p.ej. curl): usar el primero configurado.
  if (!requestOrigin && allowed.length > 0) {
    return allowed[0];
  }
  return requestOrigin || '*';
}

export const CORS_ALLOWED_HEADERS =
  'Authorization,Content-Type,X-Active-Company-Id,x-active-company-id,X-Board-Display-Token,x-board-display-token,X-Print-Agent-Token,x-print-agent-token,Accept,Origin,X-Requested-With';

export const CORS_ALLOWED_METHODS =
  'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS';
