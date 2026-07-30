/** Tablets POS táctiles grandes (p. ej. iMin): layout desktop aunque el ancho CSS sea ≤1025. */
export const POS_COMPACT_MAX_WIDTH_PX = 1025;
/** Mínimo de max(ancho, alto) para tratar tablet POS como desktop (iMin ~960px lógicos). */
export const POS_TABLET_MIN_MAX_DIMENSION_PX = 960;

export function isPosCompactLayout(
  width: number,
  height: number,
  coarsePointer: boolean,
): boolean {
  const maxDim = Math.max(width, height);
  if (coarsePointer && maxDim >= POS_TABLET_MIN_MAX_DIMENSION_PX) {
    return false;
  }
  return width <= POS_COMPACT_MAX_WIDTH_PX;
}

export function readPosCompactLayout(): boolean {
  if (typeof window === "undefined") return false;
  const coarse =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  return isPosCompactLayout(window.innerWidth, window.innerHeight, coarse);
}
