/**
 * Typed contract for PRODUCTION_BATCH manufacturing orders.
 * Stored at `transaction.metadata.productionOrder`.
 */
export type ProductionOrderAttributeSnapshot = {
  attributeId: string;
  optionId: string;
  tagKey?: string | null;
  attributeName: string;
  optionLabel: string;
};

export type ProductionOrderLotSnapshot = {
  lineKey: string;
  productVariantId: string;
  quantity: number;
  notes?: string;
  attributes: ProductionOrderAttributeSnapshot[];
  /** Filled on complete when available. */
  lineCost?: number;
  unitCost?: number;
};

export type ProductionOrderMetadata = {
  productionUnitId: string;
  capacity: number | null;
  plannedStartAt: string | null;
  plannedDeliveryAt: string | null;
  lots: ProductionOrderLotSnapshot[];
};

export function readProductionOrderMetadata(
  metadata: Record<string, unknown> | null | undefined,
): ProductionOrderMetadata | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const raw = metadata.productionOrder;
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const lotsRaw = Array.isArray(o.lots) ? o.lots : [];
  return {
    productionUnitId: String(o.productionUnitId ?? ''),
    capacity:
      o.capacity == null || o.capacity === ''
        ? null
        : Number.isFinite(Number(o.capacity))
          ? Number(o.capacity)
          : null,
    plannedStartAt:
      typeof o.plannedStartAt === 'string' && o.plannedStartAt.trim()
        ? o.plannedStartAt.trim()
        : null,
    plannedDeliveryAt:
      typeof o.plannedDeliveryAt === 'string' && o.plannedDeliveryAt.trim()
        ? o.plannedDeliveryAt.trim()
        : null,
    lots: lotsRaw.map((row) => {
      const l = (row ?? {}) as Record<string, unknown>;
      const attrs = Array.isArray(l.attributes) ? l.attributes : [];
      return {
        lineKey: String(l.lineKey ?? ''),
        productVariantId: String(l.productVariantId ?? ''),
        quantity: Number(l.quantity ?? 0),
        notes: typeof l.notes === 'string' ? l.notes : undefined,
        attributes: attrs.map((a) => {
          const x = (a ?? {}) as Record<string, unknown>;
          return {
            attributeId: String(x.attributeId ?? ''),
            optionId: String(x.optionId ?? ''),
            tagKey:
              x.tagKey == null || x.tagKey === ''
                ? null
                : String(x.tagKey),
            attributeName: String(x.attributeName ?? ''),
            optionLabel: String(x.optionLabel ?? ''),
          };
        }),
        lineCost:
          l.lineCost != null && Number.isFinite(Number(l.lineCost))
            ? Number(l.lineCost)
            : undefined,
        unitCost:
          l.unitCost != null && Number.isFinite(Number(l.unitCost))
            ? Number(l.unitCost)
            : undefined,
      };
    }),
  };
}
