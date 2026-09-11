import { ProductType } from '@modules/products/domain/product.entity';
import type { RecipeLine } from '@modules/recipes/domain/recipe-line.entity';

export type PackComponentLine = {
  inputVariantId: string;
  qtyPerOutputUnit: number;
  inputProductType?: string | null;
};

export function computePackProducibleQty(
  lines: PackComponentLine[],
  availableByVariantId: Record<string, number>,
): number | null {
  const limiting = lines.filter((l) => {
    const pt = String(l.inputProductType ?? '')
      .trim()
      .toUpperCase();
    if (
      pt === ProductType.INSUMO ||
      pt === ProductType.AGREGADO ||
      pt === ProductType.PACK
    ) {
      return false;
    }
    const qty = Number(l.qtyPerOutputUnit);
    return Number.isFinite(qty) && qty > 0;
  });
  if (limiting.length === 0) return null;

  let min: number | null = null;
  for (const line of limiting) {
    const need = Number(line.qtyPerOutputUnit);
    const avail = Number(availableByVariantId[line.inputVariantId] ?? 0);
    if (!Number.isFinite(avail) || avail < 0) {
      min = 0;
      continue;
    }
    const capacity = Math.floor(avail / need);
    min = min == null ? capacity : Math.min(min, capacity);
  }
  return min ?? 0;
}

export function computePackPmpSum(
  lines: Array<{ inputVariantId: string; qtyPerOutputUnit: number }>,
  baseCostByVariantId: Record<string, number>,
): number {
  let sum = 0;
  for (const line of lines) {
    const qty = Number(line.qtyPerOutputUnit) || 0;
    const cost = Number(baseCostByVariantId[line.inputVariantId] ?? 0) || 0;
    sum += cost * qty;
  }
  return Math.round(sum * 100) / 100;
}

export function expandPackComponentNeeds(
  packVariantId: string,
  packLineQty: number,
  recipeLines: Pick<RecipeLine, 'inputVariantId' | 'qtyPerOutputUnit'>[],
): Map<string, number> {
  const out = new Map<string, number>();
  const packQty = Number(packLineQty) || 0;
  if (packQty <= 0) return out;
  for (const line of recipeLines) {
    const perPack = Number(line.qtyPerOutputUnit) || 0;
    if (perPack <= 0) continue;
    const need = perPack * packQty;
    out.set(
      line.inputVariantId,
      (out.get(line.inputVariantId) ?? 0) + need,
    );
  }
  return out;
}

export function mergeVariantQtyMaps(
  target: Map<string, number>,
  source: Map<string, number>,
): void {
  for (const [vid, qty] of source) {
    target.set(vid, (target.get(vid) ?? 0) + qty);
  }
}
