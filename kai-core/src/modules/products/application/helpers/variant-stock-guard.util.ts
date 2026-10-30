import { In, type EntityManager } from 'typeorm';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';

export type VariantStockSummary = {
  variantId: string;
  physical: number;
  committed: number;
};

/** Stock físico y comprometido por variante (suma de todos los almacenes). */
export async function loadVariantStockSummary(
  manager: Pick<EntityManager, 'getRepository'>,
  variantIds: string[],
): Promise<VariantStockSummary[]> {
  if (variantIds.length === 0) return [];
  const levels = await manager
    .getRepository(StockLevel)
    .find({ where: { productVariantId: In(variantIds) } });
  const byVariant = new Map<string, VariantStockSummary>();
  for (const l of levels) {
    const cur = byVariant.get(l.productVariantId) ?? {
      variantId: l.productVariantId,
      physical: 0,
      committed: 0,
    };
    cur.physical += Number(l.physicalStock) || 0;
    cur.committed += Number(l.committedStock) || 0;
    byVariant.set(l.productVariantId, cur);
  }
  return [...byVariant.values()];
}

/** Variantes que aún tienen existencias (físicas o comprometidas) y bloquean su eliminación. */
export function variantsBlockingDelete(
  summary: VariantStockSummary[],
): VariantStockSummary[] {
  return summary.filter((s) => s.physical > 1e-9 || s.committed > 1e-9);
}
