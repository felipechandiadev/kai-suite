import { isKaiFoodEnabled } from "@/config/kaifood-module.config";
import type { CatalogProductType } from "@/features/inventory-products/types/product-grid.types";

const CATALOG_PRODUCT_TYPE_IDS = new Set<CatalogProductType>([
  "PHYSICAL",
  "MANUFACTURADO",
  "ELABORADO",
  "PREPARADO",
  "SERVICE",
  "DIGITAL",
]);

/** Acepta valores API; si no coincide con el catálogo conocido, físico. */
export function normalizeCatalogProductType(raw: string | null | undefined): CatalogProductType {
  const u = (raw ?? "PHYSICAL").toString().toUpperCase() as CatalogProductType;
  return CATALOG_PRODUCT_TYPE_IDS.has(u) ? u : "PHYSICAL";
}

const RECIPE_BOM_ALLOWED_TYPES = new Set<CatalogProductType>(["SERVICE", "MANUFACTURADO", "PREPARADO", "ELABORADO"]);

/** Solo estos tipos pueden tener receta / BOM en catálogo admin. */
export function catalogProductTypeAllowsRecipeBom(raw: string | null | undefined): boolean {
  const u = normalizeCatalogProductType(raw);
  return RECIPE_BOM_ALLOWED_TYPES.has(u);
}

const FINISHED_GOOD_TYPES = new Set<CatalogProductType>([
  "MANUFACTURADO",
  "ELABORADO",
  "PREPARADO",
]);

/** Terminados: stock vía producción, no por compra/recepción estándar. */
export function catalogProductTypeIsFinishedGood(raw: string | null | undefined): boolean {
  return FINISHED_GOOD_TYPES.has(normalizeCatalogProductType(raw));
}

const ALL_CATALOG_PRODUCT_TYPE_SELECT_OPTIONS: { id: CatalogProductType; label: string }[] = [
  { id: "PHYSICAL", label: "Producto físico" },
  { id: "MANUFACTURADO", label: "Manufacturado" },
  { id: "ELABORADO", label: "Elaborado" },
  { id: "PREPARADO", label: "Preparado" },
  { id: "SERVICE", label: "Servicio" },
  { id: "DIGITAL", label: "Digital" },
];

/** Opciones del selector de tipo de producto (crear / editar). */
export function getCatalogProductTypeSelectOptions(): { id: CatalogProductType; label: string }[] {
  if (isKaiFoodEnabled()) {
    return ALL_CATALOG_PRODUCT_TYPE_SELECT_OPTIONS;
  }
  return ALL_CATALOG_PRODUCT_TYPE_SELECT_OPTIONS.filter((o) => o.id !== "PREPARADO");
}

/** @deprecated Prefer `getCatalogProductTypeSelectOptions()` for KaiFood gate. */
export const CATALOG_PRODUCT_TYPE_SELECT_OPTIONS = ALL_CATALOG_PRODUCT_TYPE_SELECT_OPTIONS;
