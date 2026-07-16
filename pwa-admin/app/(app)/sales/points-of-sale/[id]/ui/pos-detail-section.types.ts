import type { PosKind } from "@/features/sales-points-of-sale/types/point-of-sale.types";

export const POS_DETAIL_SECTION_IDS = [
  "general",
  "listas",
  "medios-pago",
  "fiscal",
] as const;

export type PosDetailSectionId = (typeof POS_DETAIL_SECTION_IDS)[number];

export type PosDetailTabItem = {
  id: PosDetailSectionId;
  label: string;
};

export const POS_DETAIL_TABS: PosDetailTabItem[] = [
  { id: "general", label: "General" },
  { id: "listas", label: "Listas de precio" },
  { id: "medios-pago", label: "Medios de pago" },
  { id: "fiscal", label: "Documentos tributarios" },
];

export function isPosDetailSectionId(value: string): value is PosDetailSectionId {
  return (POS_DETAIL_SECTION_IDS as readonly string[]).includes(value);
}

export function posDetailSectionFromHash(hash: string): PosDetailSectionId | null {
  const id = hash.replace(/^#/, "").trim();
  return id && isPosDetailSectionId(id) ? id : null;
}

export function posDetailTabsForKind(kind: PosKind | undefined): PosDetailTabItem[] {
  const k = kind ?? "SALE";
  if (k === "PRESALE") {
    return POS_DETAIL_TABS.filter((t) => t.id === "general" || t.id === "listas");
  }
  return POS_DETAIL_TABS;
}
