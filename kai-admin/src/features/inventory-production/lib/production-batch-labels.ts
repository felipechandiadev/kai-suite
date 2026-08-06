import { isKaiFoodCompany } from "@/config/kaifood-module.config";

/** Copy de lotes BATCH según vertical de empresa activa. */
export function productionOrdersListTitle(kaiProduct?: string | null): string {
  return isKaiFoodCompany(kaiProduct)
    ? "Órdenes de elaboración"
    : "Órdenes de manufactura";
}

export function productionOrderCreateTitle(kaiProduct?: string | null): string {
  return isKaiFoodCompany(kaiProduct)
    ? "Nueva orden de elaboración"
    : "Nueva orden de manufactura";
}

export function productionVariantSearchHelper(kaiProduct?: string | null): string {
  return isKaiFoodCompany(kaiProduct)
    ? "Solo ELABORADO habilitado en la unidad (con receta PRODUCTION)"
    : "Solo MANUFACTURADO habilitado en la unidad (con receta PRODUCTION)";
}
