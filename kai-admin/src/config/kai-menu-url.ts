/**
 * URL pública de kai-menu (QR / “Ver carta”).
 * Preferir `KAI_MENU_URL` (runtime en el server) para producción:
 * `NEXT_PUBLIC_*` se inlinéa en el build y queda vacío o en localhost.
 */
export function resolveKaiMenuPublicUrl(): string | null {
  const raw = envTrim("KAI_MENU_URL") || envTrim("NEXT_PUBLIC_KAI_MENU_URL");
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

function envTrim(key: string): string {
  const v = process.env[key];
  return typeof v === "string" ? v.trim() : "";
}
