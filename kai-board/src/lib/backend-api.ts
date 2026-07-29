function isLoopbackHost(hostname: string): boolean {
  const h = hostname.trim().toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

/**
 * En el browser, alinear el host del API con el de la página cuando el env trae loopback.
 * Forzar `127.0.0.1` desde una página en `localhost` es cross-origin y Chrome
 * puede devolver "xhr poll error" en Socket.IO. El backend escucha dual-stack (`::`).
 */
export function resolveClientBackendApiBase(configured: string): string {
  let base = configured.replace(/\/$/, "");
  if (typeof window === "undefined") return base;
  try {
    const url = new URL(base);
    const pageHost = window.location.hostname;
    if (isLoopbackHost(url.hostname)) {
      url.hostname = pageHost;
      base = url.origin;
    }
  } catch {
    // URL inválida
  }
  return base;
}

export function getClientBackendApiBase(): string {
  const base =
    process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim() ||
    process.env.BACKEND_API_URL?.trim() ||
    "http://localhost:5050";
  return resolveClientBackendApiBase(base);
}
