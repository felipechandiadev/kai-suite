/** Cantidad de insumo en unidad base de stock para una cantidad de salida. */
export function recipeInputQuantityForOutput(
  qtyPerOutputUnit: number,
  wasteFactor: number,
  outputQty: number,
): number {
  const base = Number(qtyPerOutputUnit) || 0;
  const waste = Number(wasteFactor) || 0;
  const out = Number(outputQty) || 0;
  return (base + waste) * out;
}
