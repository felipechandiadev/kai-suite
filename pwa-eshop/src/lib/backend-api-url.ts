/**
 * URL base del backend NestJS (sin `/api`).
 * Copiar `pwa-eshop/.env.example` → `.env.local` y ajustar en red LAN.
 */
export function getServerBackendApiBase(): string {
  const base =
    process.env.BACKEND_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim();

  if (base) {
    return base.replace(/\/$/, "");
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:5030";
  }

  throw new Error(
    "BACKEND_API_URL no está definida. Copie pwa-eshop/.env.example a .env.local (p. ej. BACKEND_API_URL=http://localhost:5030).",
  );
}
