/**
 * El backend guarda rutas relativas al API (`/multimedia/files/...`).
 * Las rutas HTTP de Nest incluyen el prefijo global (p. ej. `api`).
 * En el navegador hay que prefijar `BACKEND_API_URL`, no el host del front.
 */
export function resolveMultimediaPublicUrl(publicUrl: string): string {
  const u = publicUrl.trim();
  if (!u || /^https?:\/\//i.test(u)) {
    return u;
  }
  const base =
    (
      process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim() ||
      process.env.BACKEND_API_URL?.trim() ||
      ""
    ).replace(/\/$/, "") || "";
  if (!base) {
    return u;
  }
  if (u.startsWith("/api/")) {
    return `${base}${u}`;
  }
  const apiPrefix = (process.env.BACKEND_API_PREFIX || "api").replace(/^\/+|\/+$/g, "");
  if (u.startsWith("/")) {
    return `${base}/${apiPrefix}${u}`;
  }
  return `${base}/${apiPrefix}/${u}`;
}
