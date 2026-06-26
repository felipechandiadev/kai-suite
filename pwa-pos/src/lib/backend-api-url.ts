/**
 * URLs del backend NestJS.
 * - Servidor Next (Server Actions, login): BACKEND_API_URL
 * - Navegador (WebSocket stock, etc.): NEXT_PUBLIC_BACKEND_API_URL
 *
 * En red local use la IP del host (p. ej. http://192.168.1.10:5030), no localhost,
 * si el POS se abre desde otro equipo.
 */
export function getServerBackendApiBase(): string {
  const base =
    process.env.BACKEND_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim();
  if (!base) {
    throw new Error(
      "BACKEND_API_URL no está definida. En red local use la IP LAN del servidor, p. ej. http://192.168.1.10:5030",
    );
  }
  return base.replace(/\/$/, "");
}

function isLoopbackHost(hostname: string): boolean {
  const h = hostname.trim().toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

/**
 * En tablet/LAN la PWA suele abrirse por IP (192.168.x.x) pero el .env trae localhost.
 * Reescribe solo en el navegador para que fetch/WS apunten al mismo host que la página.
 */
export function resolveClientBackendApiBase(configured: string): string {
  let base = configured.replace(/\/$/, "");
  if (typeof window === "undefined") return base;
  try {
    const url = new URL(base);
    const pageHost = window.location.hostname;
    if (isLoopbackHost(url.hostname) && !isLoopbackHost(pageHost)) {
      url.hostname = pageHost;
      base = url.origin;
    }
  } catch {
    // URL inválida: devolver tal cual
  }
  return base;
}

export function getClientBackendApiBase(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim() ||
    process.env.BACKEND_API_URL?.trim();
  if (!raw) {
    return null;
  }
  return resolveClientBackendApiBase(raw);
}
