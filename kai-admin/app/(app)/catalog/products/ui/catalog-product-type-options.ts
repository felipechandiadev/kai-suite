import { isKaiFoodEnabledForCompany } from "@/config/kaifood-module.config";
import type { CatalogProductType } from "@/features/inventory-products/types/product-grid.types";

const CATALOG_PRODUCT_TYPE_IDS = new Set<CatalogProductType>([
  "PHYSICAL",
  "INSUMO",
  "MANUFACTURADO",
  "ELABORADO",
  "PREPARADO",
  "SERVICE",
  "DIGITAL",
  "PACK",
  "AGREGADO",
]);

/** Acepta valores API; si no coincide con el catálogo conocido, físico. */
export function normalizeCatalogProductType(raw: string | null | undefined): CatalogProductType {
  const u = (raw ?? "PHYSICAL").toString().toUpperCase() as CatalogProductType;
  return CATALOG_PRODUCT_TYPE_IDS.has(u) ? u : "PHYSICAL";
}

const RECIPE_BOM_ALLOWED_TYPES = new Set<CatalogProductType>([
  "SERVICE",
  "MANUFACTURADO",
  "PREPARADO",
  "ELABORADO",
  "AGREGADO",
]);

/** Solo estos tipos pueden tener receta / BOM en catálogo admin. */
export function catalogProductTypeAllowsRecipeBom(raw: string | null | undefined): boolean {
  const u = normalizeCatalogProductType(raw);
  return RECIPE_BOM_ALLOWED_TYPES.has(u);
}

/** Composición kit fantasma (variante PACK). */
export function catalogProductTypeAllowsPackComposition(
  raw: string | null | undefined,
): boolean {
  return normalizeCatalogProductType(raw) === "PACK";
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

/** Tipos con precio de venta, eShop y despacho. */
export function catalogProductTypeIsSellable(raw: string | null | undefined): boolean {
  const t = normalizeCatalogProductType(raw);
  return t !== "INSUMO" && t !== "AGREGADO";
}

const ALL_CATALOG_PRODUCT_TYPE_SELECT_OPTIONS: { id: CatalogProductType; label: string }[] = [
  { id: "PHYSICAL", label: "Producto físico" },
  { id: "INSUMO", label: "Insumo" },
  { id: "MANUFACTURADO", label: "Manufacturado" },
  { id: "ELABORADO", label: "Elaborado" },
  { id: "PREPARADO", label: "Preparado" },
  { id: "PACK", label: "Pack (kit)" },
  { id: "AGREGADO", label: "Agregado" },
  { id: "SERVICE", label: "Servicio" },
  { id: "DIGITAL", label: "Digital" },
];

/** Etiqueta legible del tipo de producto (API / cabeceras). */
export function catalogProductTypeLabel(raw: string | null | undefined): string {
  const id = normalizeCatalogProductType(raw);
  return ALL_CATALOG_PRODUCT_TYPE_SELECT_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

/** Opciones del selector de tipo de producto (crear / editar). */
export function getCatalogProductTypeSelectOptions(
  companyKaiProduct?: string | null,
): { id: CatalogProductType; label: string }[] {
  const food = isKaiFoodEnabledForCompany(companyKaiProduct);
  return ALL_CATALOG_PRODUCT_TYPE_SELECT_OPTIONS.filter((o) => {
    if (o.id === "PREPARADO" || o.id === "AGREGADO") return food;
    return true;
  });
}

/** @deprecated Prefer `getCatalogProductTypeSelectOptions()` for KaiFood gate. */
export const CATALOG_PRODUCT_TYPE_SELECT_OPTIONS = ALL_CATALOG_PRODUCT_TYPE_SELECT_OPTIONS;
