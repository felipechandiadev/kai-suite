import { getServerBackendApiBase } from "./backend-api-url";

/** Base pública para `<img src>` (navegador). No usar 127.0.0.1. */
function getPublicBackendApiBase(): string {
  const pub = process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim();
  if (pub) return pub.replace(/\/$/, "");
  return getServerBackendApiBase();
}

/**
 * El backend guarda rutas relativas (`/multimedia/files/...`).
 * En `<img src>` hay que prefijar la URL pública del API.
 */
export function resolveMultimediaPublicUrl(publicUrl: string | null | undefined): string | null {
  const u = publicUrl?.trim();
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;

  let base: string;
  try {
    base = getPublicBackendApiBase();
  } catch {
    return u;
  }

  const apiPrefix = (process.env.BACKEND_API_PREFIX || "api").replace(/^\/+|\/+$/g, "");
  if (u.startsWith("/api/")) return `${base}${u}`;
  if (u.startsWith("/")) return `${base}/${apiPrefix}${u}`;
  return `${base}/${apiPrefix}/${u}`;
}
