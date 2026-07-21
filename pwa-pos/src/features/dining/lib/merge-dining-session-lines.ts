import type { PosDiningOrderLine } from "@/features/dining/types/dining-pos.types";
import type { DiningSessionLinePayload } from "@/features/dining/lib/use-dining-branch-realtime";

/**
 * Fusiona el payload WS de sesión con las líneas ya cargadas en POS.
 * Conserva campos locales y actualiza kitchenStatus / fire / qty / notes.
 * El payload se trata como lista completa (líneas ausentes desaparecen).
 */
export function mergeDiningSessionLines(
  existing: PosDiningOrderLine[],
  items: DiningSessionLinePayload[],
): PosDiningOrderLine[] {
  const byId = new Map(existing.map((l) => [l.id, l]));
  return items.map((item) => {
    const prev = byId.get(item.id);
    if (!prev) {
      return {
        id: item.id,
        productVariantId: item.productVariantId,
        quantity: item.quantity,
        notes: item.notes ?? null,
        kitchenStatus: item.kitchenStatus,
        kitchenFireId: item.kitchenFireId ?? null,
        kitchenFireNumber: item.kitchenFireNumber ?? null,
      };
    }
    return {
      ...prev,
      productVariantId: item.productVariantId || prev.productVariantId,
      quantity: item.quantity,
      notes: item.notes !== undefined ? item.notes : prev.notes,
      kitchenStatus: item.kitchenStatus,
      kitchenFireId:
        item.kitchenFireId !== undefined
          ? item.kitchenFireId
          : (prev.kitchenFireId ?? null),
      kitchenFireNumber:
        item.kitchenFireNumber !== undefined
          ? item.kitchenFireNumber
          : (prev.kitchenFireNumber ?? null),
    };
  });
}
