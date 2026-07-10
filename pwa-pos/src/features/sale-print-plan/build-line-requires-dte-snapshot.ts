import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import { lineRequiresDte } from "./types";

/** Snapshot fiscal por variante al confirmar venta (clasificación vista por el cajero). */
export function buildLineRequiresDteSnapshot(
  lines: PosCartLine[],
): Record<string, boolean> {
  const snapshot: Record<string, boolean> = {};
  for (const line of lines) {
    const variantId = line.variantId?.trim();
    if (!variantId) continue;
    snapshot[variantId] = lineRequiresDte(line);
  }
  return snapshot;
}
