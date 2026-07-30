/** Línea mínima para el cálculo CTP (capable-to-promise). */
export type CtpRecipeLineInput = {
  inputVariantId: string;
  qtyPerOutputUnit: number;
  wasteFactor: number;
  limitsProjectedStock: boolean;
  /** Si false, la línea no limita aunque el flag esté ON. */
  trackInventory?: boolean;
};

export type CtpDetailReason =
  | 'NO_RECIPE'
  | 'NO_ROUTING'
  | 'NO_STORAGE'
  | 'NO_LIMITING_LINES';

export type CtpDetailLineInput = CtpRecipeLineInput & {
  inputProductName?: string | null;
  inputSku?: string | null;
  inputStockBaseUnitLabel?: string | null;
};

export type CtpDetailLineResult = {
  inputVariantId: string;
  inputProductName: string | null;
  inputSku: string | null;
  inputStockBaseUnitLabel: string | null;
  qtyPerOutputUnit: number;
  wasteFactor: number;
  limitsProjectedStock: boolean;
  trackInventory: boolean;
  consumptionPerUnit: number;
  available: number;
  lineCapacity: number | null;
  isBottleneck: boolean;
};

function isLimitingLine(line: CtpRecipeLineInput): boolean {
  return (
    line.limitsProjectedStock !== false &&
    line.trackInventory !== false &&
    (Number(line.qtyPerOutputUnit) || 0) + (Number(line.wasteFactor) || 0) > 0
  );
}

function consumptionPerUnit(line: CtpRecipeLineInput): number {
  return (Number(line.qtyPerOutputUnit) || 0) + (Number(line.wasteFactor) || 0);
}

/**
 * Capacidad producible = min floor(available / (qty+waste)) sobre líneas limitantes.
 * Sin ninguna línea limitante → null (no badge / no ∞).
 */
export function producibleQtyFromLines(
  lines: readonly CtpRecipeLineInput[],
  availableByInputVariantId: ReadonlyMap<string, number>,
): number | null {
  const limiting = lines.filter(
    (l) =>
      l.limitsProjectedStock !== false &&
      l.trackInventory !== false &&
      (Number(l.qtyPerOutputUnit) || 0) + (Number(l.wasteFactor) || 0) > 0,
  );

  if (limiting.length === 0) {
    return null;
  }

  let minQty = Number.POSITIVE_INFINITY;
  for (const line of limiting) {
    const consumption =
      (Number(line.qtyPerOutputUnit) || 0) + (Number(line.wasteFactor) || 0);
    if (consumption <= 0) {
      continue;
    }
    const available = Number(
      availableByInputVariantId.get(line.inputVariantId) ?? 0,
    );
    const capacity = Math.floor(available / consumption);
    if (capacity < minQty) {
      minQty = capacity;
    }
  }

  if (!Number.isFinite(minQty)) {
    return null;
  }
  return Math.max(0, minQty);
}

/** Desglose CTP por línea BOM con marcado de cuello de botella. */
export function buildCtpDetailLines(
  lines: readonly CtpDetailLineInput[],
  availableByInputVariantId: ReadonlyMap<string, number>,
): { producibleQty: number | null; lines: CtpDetailLineResult[] } {
  const limitingCapacities: number[] = [];

  const mapped: CtpDetailLineResult[] = lines.map((line) => {
    const qty = Number(line.qtyPerOutputUnit ?? 0);
    const waste = Number(line.wasteFactor ?? 0);
    const consumption = consumptionPerUnit(line);
    const trackInventory = line.trackInventory !== false;
    const limits = line.limitsProjectedStock !== false;
    const available = Number(
      availableByInputVariantId.get(line.inputVariantId) ?? 0,
    );

    let lineCapacity: number | null = null;
    if (isLimitingLine(line)) {
      lineCapacity = Math.floor(available / consumption);
      limitingCapacities.push(lineCapacity);
    }

    return {
      inputVariantId: line.inputVariantId,
      inputProductName: line.inputProductName ?? null,
      inputSku: line.inputSku ?? null,
      inputStockBaseUnitLabel: line.inputStockBaseUnitLabel ?? null,
      qtyPerOutputUnit: qty,
      wasteFactor: waste,
      limitsProjectedStock: limits,
      trackInventory,
      consumptionPerUnit: consumption,
      available,
      lineCapacity,
      isBottleneck: false,
    };
  });

  const producibleQty = producibleQtyFromLines(lines, availableByInputVariantId);
  if (producibleQty == null || limitingCapacities.length === 0) {
    return { producibleQty, lines: mapped };
  }

  const minCap = Math.min(...limitingCapacities);
  const withBottleneck = mapped.map((row) => ({
    ...row,
    isBottleneck: row.lineCapacity != null && row.lineCapacity === minCap,
  }));

  return { producibleQty, lines: withBottleneck };
}
