export type VariantWeightUnit = "g" | "kg";

export const VARIANT_WEIGHT_UNIT_OPTIONS: { id: VariantWeightUnit; label: string }[] = [
  { id: "g", label: "Gramo (g)" },
  { id: "kg", label: "Kilogramo (kg)" },
];

/** Convierte valor UI + unidad a `netWeightKg` (BD). Vacío → `null`. */
export function displayWeightToNetWeightKg(
  value: string,
  unit: VariantWeightUnit,
): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) {
    return null;
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) {
    return null;
  }
  const kg = unit === "g" ? n / 1000 : n;
  return Number(kg.toFixed(6));
}

/** Carga desde `netWeightKg`: muestra en gramos (joyería). */
export function netWeightKgToDisplay(netWeightKg: number | null | undefined): {
  value: string;
  unit: VariantWeightUnit;
} {
  if (netWeightKg == null || !Number.isFinite(Number(netWeightKg))) {
    return { value: "", unit: "g" };
  }
  const grams = Number(netWeightKg) * 1000;
  return { value: String(Number(grams.toFixed(3))), unit: "g" };
}

/** Peso en gramos para la calculadora de joyería. */
export function weightInGrams(value: string, unit: VariantWeightUnit): number {
  const kg = displayWeightToNetWeightKg(value, unit);
  if (kg == null) {
    return 0;
  }
  return Number((kg * 1000).toFixed(3));
}
