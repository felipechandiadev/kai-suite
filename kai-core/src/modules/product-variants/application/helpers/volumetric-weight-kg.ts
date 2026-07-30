/** Divisor por defecto (L×W×H en cm³) → kg volumétrico; común en couriers CL/LATAM. */
export const DEFAULT_VOLUMETRIC_DIVISOR_K = 5000;

export function effectiveVolumetricDivisorK(
  volumetricDivisorK: number | null | undefined,
): number {
  const k = volumetricDivisorK;
  if (k != null && Number.isFinite(k) && k > 0) {
    return k;
  }
  return DEFAULT_VOLUMETRIC_DIVISOR_K;
}

/**
 * Peso volumétrico en kg: (L × W × H) / K con dimensiones del empaque en cm.
 * Retorna null si falta alguna dimensión o K no es válido.
 */
export function volumetricWeightKgFromPackageCm(input: {
  packageLengthCm: number | null | undefined;
  packageWidthCm: number | null | undefined;
  packageHeightCm: number | null | undefined;
  volumetricDivisorK?: number | null;
}): number | null {
  const L = Number(input.packageLengthCm);
  const W = Number(input.packageWidthCm);
  const H = Number(input.packageHeightCm);
  const K = effectiveVolumetricDivisorK(input.volumetricDivisorK);
  if (![L, W, H].every((x) => Number.isFinite(x) && x > 0) || !(K > 0)) {
    return null;
  }
  return (L * W * H) / K;
}
