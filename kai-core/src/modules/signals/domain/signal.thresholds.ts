/**
 * Umbrales v1 hardcodeados (luego company settings).
 * Mantener nombres explícitos para no perder trazabilidad en copy/tests.
 */
export const SIGNAL_THRESHOLDS = {
  reorder: {
    watchMinSkus: 1,
    criticalMinSkus: 5,
  },
  salesWeekdayPace: {
    watchDropPct: -10,
    criticalDropPct: -20,
    baselineWeeks: 4,
  },
  voidRate: {
    /** Multiplicador vs baseline 30d (misma ventana relativa). */
    watchMultiplier: 2,
    criticalMultiplier: 3,
    /** Ventana reciente (días) vs baseline (días previos). */
    recentDays: 7,
    baselineDays: 28,
  },
  paymentFeeDrag: {
    /** fee estimado / margen bruto. */
    watchPctOfMargin: 8,
    criticalPctOfMargin: 15,
  },
  deadStock: {
    idleDays: 60,
    /** Capital inmovilizado (CLP) — umbral WATCH; CRITICAL = 2×. */
    watchCapitalClp: 500_000,
  },
  stockDaysCover: {
    salesWindowDays: 30,
    watchMaxDays: 7,
    criticalMaxDays: 3,
    topN: 8,
  },
  buyNow: {
    topN: 8,
  },
} as const;
