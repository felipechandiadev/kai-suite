import { isPosCompactLayout } from "./pos-layout-breakpoint";

/** Tablet POS táctil grande (iMin): layout desktop + densidad reducida. */
export function isPosTabletDensity(
  width: number,
  height: number,
  coarsePointer: boolean,
): boolean {
  return coarsePointer && !isPosCompactLayout(width, height, coarsePointer);
}

export function readPosTabletDensity(): boolean {
  if (typeof window === "undefined") return false;
  const coarse =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  return isPosTabletDensity(window.innerWidth, window.innerHeight, coarse);
}
