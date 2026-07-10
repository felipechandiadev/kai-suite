export const VARIANT_TAX_CATEGORIES = [
  "TAX_STANDARD",
  "TAX_EXEMPT",
  "TAX_OUT_OF_SCOPE",
  "TAX_PRE_PAID",
  "TAX_REMITTED_UPSTREAM",
  "TAX_EXTERNAL",
] as const;

export type VariantTaxCategory = (typeof VARIANT_TAX_CATEGORIES)[number];

export const DEFAULT_VARIANT_TAX_CATEGORY: VariantTaxCategory = "TAX_STANDARD";

export function isVariantTaxCategory(value: unknown): value is VariantTaxCategory {
  return (
    typeof value === "string" &&
    (VARIANT_TAX_CATEGORIES as readonly string[]).includes(value.trim())
  );
}

export function normalizeVariantTaxCategory(value: unknown): VariantTaxCategory {
  if (isVariantTaxCategory(value)) {
    return value.trim() as VariantTaxCategory;
  }
  return DEFAULT_VARIANT_TAX_CATEGORY;
}

export type VariantTaxCategoryOption = {
  id: VariantTaxCategory;
  label: string;
  description: string;
};

export const VARIANT_TAX_CATEGORY_OPTIONS: VariantTaxCategoryOption[] = [
  {
    id: "TAX_STANDARD",
    label: "Venta estándar (IVA 19%)",
    description:
      "Producto o servicio afecto a IVA. El local cobra IVA y puede sumar impuestos adicionales (ILA, suntuario).",
  },
  {
    id: "TAX_EXEMPT",
    label: "Exento de IVA (por ley)",
    description:
      "Operación comercial liberada de IVA por ley (salud ambulatoria, educación, transporte, etc.). Emite boleta exenta.",
  },
  {
    id: "TAX_OUT_OF_SCOPE",
    label: "No afecto a IVA",
    description:
      "Operación fuera del ámbito del IVA. No requiere documento tributario en condiciones normales.",
  },
  {
    id: "TAX_PRE_PAID",
    label: "IVA ya retenido",
    description:
      "El IVA ya se pagó o retuvo en etapas anteriores (cambio de sujeto). El local no recauda IVA al vender.",
  },
  {
    id: "TAX_REMITTED_UPSTREAM",
    label: "Impuesto pagado en origen",
    description:
      "El IVA se pagó en fábrica o importación. El detallista vende sin sumar 19% nuevo.",
  },
  {
    id: "TAX_EXTERNAL",
    label: "Sin IVA local (legacy)",
    description:
      "Tratamiento especial sin IVA 19% del local. Para ILA u otros adicionales use venta estándar con impuestos del catálogo.",
  },
];

export function variantTaxCategoryLabel(category: VariantTaxCategory): string {
  return VARIANT_TAX_CATEGORY_OPTIONS.find((o) => o.id === category)?.label ?? category;
}

export function variantTaxCategoryDescription(category: VariantTaxCategory): string {
  return VARIANT_TAX_CATEGORY_OPTIONS.find((o) => o.id === category)?.description ?? "";
}

export function allowsSaleTaxIds(category: VariantTaxCategory): boolean {
  return category === "TAX_STANDARD";
}

export function forcesNetEqualsGross(category: VariantTaxCategory): boolean {
  return category !== "TAX_STANDARD";
}

export function isLegallyExemptLine(category: VariantTaxCategory): boolean {
  return category === "TAX_EXEMPT";
}

export function isOutOfFiscalScope(category: VariantTaxCategory): boolean {
  return category === "TAX_OUT_OF_SCOPE";
}

export function resolveBoletaLineExempt(category: VariantTaxCategory): boolean {
  return category !== "TAX_STANDARD";
}

export function variantHasLocalIva(category: VariantTaxCategory): boolean {
  return category === "TAX_STANDARD";
}

export function variantBoletaLineKind(category: VariantTaxCategory): "Afecta" | "Exenta" {
  return category === "TAX_STANDARD" ? "Afecta" : "Exenta";
}

export function defaultRequiresDteForCategory(category: VariantTaxCategory): boolean {
  return category !== "TAX_OUT_OF_SCOPE";
}
