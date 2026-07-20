/** Rutas del módulo SII (sidebar raíz). */
export const SII = "/sii";
export const SII_CONTRIBUYENTE = `${SII}/contribuyente`;
export const SII_DOCUMENTOS = `${SII}/documentos`;
export const SII_CREDENCIALES = `${SII}/credenciales`;
export const SII_CERTIFICACION = `${SII}/certificacion`;
export const SII_FOLIOS = `${SII}/folios`;
export const SII_PRODUCCION = `${SII}/produccion`;
export const SII_IMPRESION_PRUEBA = `${SII}/herramientas/impresion-prueba`;

/** @deprecated Usar {@link SII_CONTRIBUYENTE}. */
export const SII_EMISOR_LEGACY = `${SII}/emisor`;

/** @deprecated Redirect desde Configuración. */
export const SETTINGS_SII_LEGACY = "/settings/sii";

/** Rutas revalidadas por Server Actions fiscales. */
export const SII_REVALIDATE_PATHS = [
  SII,
  SII_CONTRIBUYENTE,
  SII_DOCUMENTOS,
  SII_CREDENCIALES,
  SII_CERTIFICACION,
  SII_FOLIOS,
  SII_PRODUCCION,
  SII_IMPRESION_PRUEBA,
] as const;

export function siiFoliosPath(opts?: { tab?: string; package?: string }): string {
  const qs = new URLSearchParams();
  if (opts?.tab?.trim()) qs.set("tab", opts.tab.trim());
  if (opts?.package?.trim()) qs.set("package", opts.package.trim());
  const q = qs.toString();
  return q ? `${SII_FOLIOS}?${q}` : SII_FOLIOS;
}

export function siiCertificacionPath(tab?: string): string {
  if (!tab?.trim()) return SII_CERTIFICACION;
  return `${SII_CERTIFICACION}?tab=${encodeURIComponent(tab.trim())}`;
}
