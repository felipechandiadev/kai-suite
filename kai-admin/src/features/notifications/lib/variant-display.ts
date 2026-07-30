/** Valores de atributos unidos (misma convención que la grilla de stock). */
export function formatAttributeValues(
  av: Record<string, unknown> | undefined | null,
): string {
  if (!av || typeof av !== "object" || Array.isArray(av)) {
    return "";
  }
  const values = Object.values(av)
    .map((v) => String(v ?? "").trim())
    .filter(Boolean);
  return values.length > 0 ? values.join(" · ") : "";
}

/** Extrae nombre de producto del título legacy `Stock bajo mínimo: …`. */
export function productNameFromNotificationTitle(title: string): string {
  const idx = title.indexOf(": ");
  if (idx >= 0) {
    return title.slice(idx + 2).trim();
  }
  return title.trim();
}
