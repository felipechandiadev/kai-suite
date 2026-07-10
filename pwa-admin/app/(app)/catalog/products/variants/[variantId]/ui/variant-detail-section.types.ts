export const VARIANT_DETAIL_SECTION_IDS = [
  "identidad",
  "precios",
  "sii",
  "compras",
  "inventario",
  "despacho",
  "multimedia",
  "eshop",
  "receta",
] as const;

export type VariantDetailSectionId = (typeof VARIANT_DETAIL_SECTION_IDS)[number];

export type VariantDetailTabItem = {
  id: VariantDetailSectionId;
  label: string;
};

export const VARIANT_DETAIL_TABS: VariantDetailTabItem[] = [
  { id: "identidad", label: "Identidad" },
  { id: "precios", label: "Precios" },
  { id: "sii", label: "SII" },
  { id: "compras", label: "Compras" },
  { id: "inventario", label: "Inventario" },
  { id: "despacho", label: "Despacho" },
  { id: "multimedia", label: "Multimedia" },
  { id: "eshop", label: "eShop" },
  { id: "receta", label: "Receta" },
];

export function isVariantDetailSectionId(value: string): value is VariantDetailSectionId {
  return (VARIANT_DETAIL_SECTION_IDS as readonly string[]).includes(value);
}

export function variantDetailSectionFromHash(hash: string): VariantDetailSectionId | null {
  const id = hash.replace(/^#/, "").trim();
  return id && isVariantDetailSectionId(id) ? id : null;
}
