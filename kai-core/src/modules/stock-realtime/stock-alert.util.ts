import type { StockAlertKind } from './stock-realtime.types';

export type StockThresholdEvaluation = {
  min: number;
  max: number;
  reorder: number;
  minEnabled: boolean;
  maxEnabled: boolean;
  reorderEnabled: boolean;
};

/**
 * Una sola alerta por variante+almacén por evaluación (prioridad: bajo mínimo > sobre máximo > reposición).
 */
export function computeStockAlertsFromThresholds(
  physical: number,
  thresholds: StockThresholdEvaluation,
): StockAlertKind[] {
  return computeStockAlertsFromThresholdsScoped({
    ...thresholds,
    minPhysical: physical,
    maxPhysical: physical,
    reorderPhysical: physical,
  });
}

/** Cada umbral puede compararse contra stock del almacén o total de la variante. */
export function computeStockAlertsFromThresholdsScoped(
  thresholds: StockThresholdEvaluation & {
    minPhysical: number;
    maxPhysical: number;
    reorderPhysical: number;
  },
): StockAlertKind[] {
  const {
    min,
    max,
    reorder,
    minEnabled,
    maxEnabled,
    reorderEnabled,
    minPhysical,
    maxPhysical,
    reorderPhysical,
  } = thresholds;
  if (minEnabled && minPhysical < min) {
    return ['below_minimum'];
  }
  if (maxEnabled && maxPhysical > max) {
    return ['above_maximum'];
  }
  if (reorderEnabled && reorderPhysical <= reorder) {
    return ['reorder'];
  }
  return [];
}
