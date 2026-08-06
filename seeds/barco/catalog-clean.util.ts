/**
 * Limpieza / heurísticas compartidas catálogo Barco (export Excel + seed).
 */

const PAREN_EAN_RE = /\((\d{8,14})\)\s*$/;

/** Quita sufijo `(EAN)` del nombre cuando el número coincide con barcode o sku. */
export function stripParenEanFromName(
  name: string,
  barcode?: string | null,
  sku?: string | null,
): { clean: string; original: string; stripped: boolean } {
  const original = String(name ?? "").trim();
  const m = PAREN_EAN_RE.exec(original);
  if (!m) {
    return { clean: original, original, stripped: false };
  }
  const digits = m[1]!;
  const bc = String(barcode ?? "").trim();
  const sk = String(sku ?? "").trim();
  if (digits !== bc && digits !== sk) {
    return { clean: original, original, stripped: false };
  }
  const clean = original.slice(0, m.index).trim();
  return {
    clean: clean || original,
    original,
    stripped: Boolean(clean),
  };
}

export function normalizeProductNameKey(s: string): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Cuando varios productos comparten el mismo nombre (exacto o normalizado),
 * agrega sufijo único `(barcode|sku)` para que el nombre quede distintivo.
 * Filas sin colisión conservan el nombre limpio.
 */
export function disambiguateDuplicateNames<
  T extends {
    nombre: string;
    codigo_barras?: string;
    sku?: string;
    nota?: string;
  },
>(rows: T[]): T[] {
  const byKey = new Map<string, number[]>();
  rows.forEach((row, i) => {
    const key = normalizeProductNameKey(row.nombre);
    if (!key) return;
    const list = byKey.get(key);
    if (list) list.push(i);
    else byKey.set(key, [i]);
  });

  const usedNames = new Set<string>();
  for (const [, indexes] of byKey) {
    if (indexes.length !== 1) continue;
    const i = indexes[0]!;
    usedNames.add(normalizeProductNameKey(rows[i]!.nombre));
  }

  const out = rows.map((r) => ({ ...r }));
  for (const [, indexes] of byKey) {
    if (indexes.length < 2) continue;
    for (const i of indexes) {
      const row = out[i]!;
      const base = String(row.nombre ?? "").trim() || "Producto";
      const bc = String(row.codigo_barras ?? "").trim();
      const sk = String(row.sku ?? "").trim();
      const id = bc || sk || `r${i + 2}`;
      let candidate = `${base} (${id})`;
      let n = 2;
      while (usedNames.has(normalizeProductNameKey(candidate))) {
        candidate = `${base} (${id}-${n})`;
        n += 1;
      }
      usedNames.add(normalizeProductNameKey(candidate));
      const notes = String(row.nota ?? "")
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean);
      if (!notes.includes("nombre_desambiguado")) {
        notes.push("nombre_desambiguado");
      }
      out[i] = {
        ...row,
        nombre: candidate,
        nota: notes.join("; "),
      };
    }
  }
  return out;
}

const KITCHEN_CATEGORY_EXACT = new Set(
  [
    "EMPANADAS",
    "COMPLETOS",
    "HELADOS",
    "HELADO SOFT",
    "COPON DE HELADO",
    "EXTRA DE HELADO",
    "TOPPING",
    "BATIDOS",
    "MILKSHAKE",
    "CAFE EN VASO JV",
    "CAFE HELADO",
    "JUGOS NATURALES",
    "PASTELERIA",
    "PROMOCION CAFE + DULCE",
    "COCTEL",
    "BAR",
    "BEBESTIBLES",
    "BOMBONES",
    "DULCES",
    "CREMA",
  ].map((s) => s.toLowerCase()),
);

function normalizeCat(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Categorías / SKU típicos de menú cocina (heurística para Excel cliente). */
export function isKitchenCandidate(input: {
  categoryName?: string | null;
  sku?: string | null;
}): boolean {
  const cat = normalizeCat(input.categoryName ?? "");
  if (cat && KITCHEN_CATEGORY_EXACT.has(cat)) return true;
  if (cat.startsWith("helado") || cat.startsWith("cafe") || cat.startsWith("jugo")) {
    return true;
  }
  if (cat.includes("promocion") && (cat.includes("cafe") || cat.includes("dulce"))) {
    return true;
  }
  if (cat.startsWith("copon") || cat.startsWith("extra de helado")) return true;

  const sku = String(input.sku ?? "").trim();
  if (/^[EX]\d+$/i.test(sku)) return true;
  return false;
}

export type SuggestedProductType = "PHYSICAL" | "PREPARADO" | "ELABORADO";

export function suggestProductTypeAndKitchen(input: {
  categoryName?: string | null;
  sku?: string | null;
}): { tipo: SuggestedProductType; cocina: string; menu: boolean } {
  if (isKitchenCandidate(input)) {
    return { tipo: "PREPARADO", cocina: "Cocina", menu: true };
  }
  return { tipo: "PHYSICAL", cocina: "", menu: false };
}
