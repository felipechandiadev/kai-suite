import type { ParsedScaleFrame, ScaleOutputUnit } from "./types";

/** Parsea una trama cruda de balanza (ej. "+000125.00 g"). */
export function parseScaleFrame(raw: string): ParsedScaleFrame {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { value: null, unit: null };
  }

  const numericCandidate = trimmed.replace(/[^0-9+\-.,]/g, "").replace(",", ".");
  const parsed = Number.parseFloat(numericCandidate);
  const value = Number.isNaN(parsed) ? null : parsed;
  const unitMatch = trimmed.match(/[A-Za-z]{1,3}$/);
  const unit = unitMatch ? unitMatch[0].toLowerCase() : null;

  return { value, unit };
}

const OZ_TO_GRAMS = 28.349523125;
const CARAT_TO_GRAMS = 0.2;

/** Normaliza peso a gramos según la unidad reportada o la configurada. */
export function normalizeWeightToGrams(
  value: number,
  unit: string | null,
  fallbackUnit: ScaleOutputUnit = "g",
): number {
  const normalized = (unit ?? fallbackUnit).toLowerCase();

  if (normalized === "g" || normalized === "gr" || normalized === "gram" || normalized === "grams") {
    return Number(value.toFixed(3));
  }
  if (normalized === "oz" || normalized === "ounce" || normalized === "ounces") {
    return Number((value * OZ_TO_GRAMS).toFixed(3));
  }
  if (normalized === "ct" || normalized === "carat" || normalized === "carats") {
    return Number((value * CARAT_TO_GRAMS).toFixed(3));
  }

  return Number(value.toFixed(3));
}

export function buildScaleReading(
  rawFrame: string,
  fallbackUnit: ScaleOutputUnit = "g",
): { rawFrame: string; value: number; unit: string | null; weightGrams: number } | null {
  const { value, unit } = parseScaleFrame(rawFrame);
  if (value == null) {
    return null;
  }
  const weightGrams = normalizeWeightToGrams(value, unit, fallbackUnit);
  return { rawFrame: rawFrame.trim(), value, unit, weightGrams };
}
