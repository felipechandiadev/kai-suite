export type ProductionAttributeOption = {
  id: string;
  label: string;
  displayOrder: number;
};

export type ProductionAttribute = {
  id: string;
  name: string;
  description: string | null;
  tagKey: string | null;
  tagLabel: string | null;
  displayOrder: number;
  options: ProductionAttributeOption[];
};

/** Tags sugeridos para agrupar (slug + label). */
export const PRODUCTION_ATTRIBUTE_TAG_PRESETS: Array<{
  key: string;
  label: string;
}> = [
  { key: "herrajes", label: "Herrajes" },
  { key: "hilos", label: "Hilos" },
  { key: "etiquetado", label: "Etiquetado" },
  { key: "acabados", label: "Acabados" },
  { key: "telas", label: "Telas" },
];

export function emptyProductionAttribute(
  displayOrder: number,
): ProductionAttribute {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const optId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-opt-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    name: "",
    description: null,
    tagKey: null,
    tagLabel: null,
    displayOrder,
    options: [{ id: optId, label: "", displayOrder: 0 }],
  };
}

export function slugifyProductionTagKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
