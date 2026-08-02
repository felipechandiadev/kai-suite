/**
 * Reparte `total` (CLP enteros) entre pesos positivos.
 * Residuo de redondeo al primer destinatario con peso > 0.
 */
export function distributeByWeights(
  total: number,
  weights: Array<{ id: string; weight: number }>,
): Array<{ id: string; amount: number }> {
  const roundedTotal = Math.max(0, Math.round(total));
  const positive = weights.filter((w) => w.weight > 0 && w.id.trim());
  if (roundedTotal <= 0 || positive.length === 0) return [];

  const sumW = positive.reduce((a, w) => a + w.weight, 0);
  if (sumW <= 0) return [];

  const out: Array<{ id: string; amount: number }> = [];
  let allocated = 0;
  for (let i = 0; i < positive.length; i++) {
    const w = positive[i]!;
    const isLast = i === positive.length - 1;
    const amount = isLast
      ? roundedTotal - allocated
      : Math.floor((roundedTotal * w.weight) / sumW);
    allocated += amount;
    out.push({ id: w.id, amount });
  }
  return out.filter((r) => r.amount > 0);
}
