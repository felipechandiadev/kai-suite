import type { Option } from "@kai/ui";

/** Códigos de `partnerType` en backend → etiqueta en español para UI. */
export const PARTNER_TYPE_LABELS: Record<string, string> = {
  FOUNDING_PARTNER: "Socio fundador",
  INVESTING_PARTNER: "Socio inversionista",
  OTHER: "Otro",
};

export function partnerTypeLabel(code: string | null | undefined): string {
  const key = code?.trim();
  if (!key) {
    return "—";
  }
  return PARTNER_TYPE_LABELS[key] ?? key;
}

export const PARTNER_TYPE_OPTIONS: Option[] = Object.entries(PARTNER_TYPE_LABELS).map(
  ([id, label]) => ({ id, label }),
);
