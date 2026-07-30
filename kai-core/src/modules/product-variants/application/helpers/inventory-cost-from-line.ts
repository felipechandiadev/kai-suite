/**
 * Costo de inventario por línea y costo por **unidad base de stock** de la variante.
 *
 * Invariantes (deben cumplir las rutas que crean la transacción, p. ej. `enrichCreateTransactionDto`):
 * - `quantity` está en la unidad de la línea (`unitId`).
 * - `unitCost` (si existe) es costo **por esa misma unidad** (no por unidad base).
 * - `quantityInBase` es la misma cantidad expresada en la unidad base de stock de la variante.
 *
 * Entonces el costo total de la línea es `unitCost * quantity` y el costo medio por unidad base es
 * `totalLineCost / quantityInBase`, equivalente a `(unitCost * quantity) / quantityInBase`.
 *
 * Si no hay `unitCost` pero sí `subtotal` (p. ej. compras valoradas solo por total línea), se usa
 * `subtotal` como costo total de la línea para la misma división.
 */
export function totalInventoryLineCost(line: {
  unitCost?: number | null;
  quantity?: number | null;
  subtotal?: number | null;
}): number {
  const uc = Number(line.unitCost ?? 0) || 0;
  const q = Number(line.quantity ?? 0) || 0;
  const fromUnitCost = uc > 0 && q > 0 ? uc * q : 0;
  if (fromUnitCost > 0) {
    return Number(fromUnitCost.toFixed(6));
  }
  const st = Number(line.subtotal ?? 0) || 0;
  return st > 0 ? Number(st.toFixed(6)) : 0;
}

/** Costo en moneda por 1 unidad de stock base. 0 si no se puede derivar. */
export function costPerStockBaseUnit(totalLineCost: number, quantityInBase: number): number {
  const base = Number(quantityInBase) || 0;
  if (base <= 0 || totalLineCost <= 0) {
    return 0;
  }
  return Number((totalLineCost / base).toFixed(6));
}

/**
 * PMP de la **entidad variante** (un valor global): costo medio por unidad base de stock,
 * ponderado con el inventario físico total **antes** de esta transacción (`globalStockBefore`),
 * más las salidas y entradas en unidad base de **esta** transacción.
 *
 * - Las salidas consumen valor a `prevPmp` (no cambian el costo unitario en promedio ponderado clásico).
 * - Las entradas con costo añaden `inCostTotal` repartido sobre `inQtyBase`.
 *
 * Si no hay entrada valorada (`inQtyBase` / `inCostTotal`), no hay recálculo → `null`.
 */
export function weightedAveragePmpAfterInventoryMove(input: {
  globalStockBefore: number;
  prevPmp: number;
  /** Cantidad en unidad base que sale (ventas, transferencias out, etc.). */
  outQtyBase: number;
  /** Cantidad en unidad base que entra con costo conocido. */
  inQtyBase: number;
  /** Suma de costos de línea (moneda) asociados a `inQtyBase`. */
  inCostTotal: number;
}): { newPmp: number } | null {
  const G0 = Number(input.globalStockBefore) || 0;
  const prev = Number(input.prevPmp) || 0;
  const out = Math.max(0, Number(input.outQtyBase) || 0);
  const inQ = Math.max(0, Number(input.inQtyBase) || 0);
  const inC = Math.max(0, Number(input.inCostTotal) || 0);

  if (inQ <= 0 || inC <= 0) {
    return null;
  }

  const stockAfterOut = G0 - out;
  const denom = stockAfterOut + inQ;

  if (denom <= 0) {
    const per = costPerStockBaseUnit(inC, inQ);
    return per > 0 ? { newPmp: Number(per.toFixed(2)) } : null;
  }

  const numerator = stockAfterOut * prev + inC;
  const newPmpRaw = numerator / denom;
  if (!Number.isFinite(newPmpRaw)) {
    return null;
  }
  return { newPmp: Number(newPmpRaw.toFixed(2)) };
}

export type ResolvePmpAfterValuedInboundInput = {
  /** PMP vigente; `null` = aún no hubo primera compra valorada. */
  prevPmp: number | null;
  globalStockBefore: number;
  outQtyBase: number;
  inQtyBase: number;
  inCostTotal: number;
};

/**
 * Asigna o recalcula PMP tras una entrada valorada (p. ej. compra).
 * - Sin PMP previo: costo unitario base de esta entrada (ignora stock previo sin costo).
 * - Con PMP previo: promedio ponderado global.
 */
export function resolvePmpAfterValuedInbound(
  input: ResolvePmpAfterValuedInboundInput,
): { newPmp: number } | null {
  const inQ = Math.max(0, Number(input.inQtyBase) || 0);
  const inC = Math.max(0, Number(input.inCostTotal) || 0);
  if (inQ <= 0 || inC <= 0) {
    return null;
  }

  if (input.prevPmp == null || !Number.isFinite(Number(input.prevPmp))) {
    const per = costPerStockBaseUnit(inC, inQ);
    return per > 0 ? { newPmp: Number(per.toFixed(2)) } : null;
  }

  return weightedAveragePmpAfterInventoryMove({
    globalStockBefore: input.globalStockBefore,
    prevPmp: Number(input.prevPmp),
    outQtyBase: input.outQtyBase,
    inQtyBase: inQ,
    inCostTotal: inC,
  });
}
