/**
 * Slug canónico de comuna (sin acentos, lowercase, espacios → `-`).
 * Debe coincidir con `code` en `MAULE_COMMUNES_SEED` del backend.
 */
export function communeSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
