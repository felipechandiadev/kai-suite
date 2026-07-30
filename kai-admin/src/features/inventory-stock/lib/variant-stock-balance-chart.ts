import type { StockMovementRow } from "../types/stock-grid.types";

export type StockBalanceChartPoint = {
  t: number;
  label: string;
  at: string;
  value: number;
};

export type StockBalanceChartSeriesLine = {
  key: string;
  label: string;
  points: StockBalanceChartPoint[];
};

export type StockBalanceChartMeta = {
  from: string;
  to: string;
  bucketLabel: string;
  movementsUsed: number;
  movementsTotal: number;
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function formatShortDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-CL", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Intervalo de agrupación según el rango temporal de los movimientos cargados. */
export function chooseBucketIntervalMs(spanMs: number): number {
  const targetBuckets = 28;
  const raw = Math.max(HOUR_MS, spanMs / targetBuckets);
  const candidates = [
    HOUR_MS,
    6 * HOUR_MS,
    12 * HOUR_MS,
    DAY_MS,
    7 * DAY_MS,
    30 * DAY_MS,
    90 * DAY_MS,
    365 * DAY_MS,
  ];
  for (const c of candidates) {
    if (raw <= c) {
      return c;
    }
  }
  return 365 * DAY_MS;
}

export function bucketIntervalLabel(ms: number): string {
  if (ms <= HOUR_MS) {
    return "por hora";
  }
  if (ms <= 6 * HOUR_MS) {
    return "cada 6 horas";
  }
  if (ms <= 12 * HOUR_MS) {
    return "cada 12 horas";
  }
  if (ms <= DAY_MS) {
    return "por día";
  }
  if (ms <= 7 * DAY_MS) {
    return "por semana";
  }
  if (ms <= 30 * DAY_MS) {
    return "por mes";
  }
  if (ms <= 90 * DAY_MS) {
    return "por trimestre";
  }
  return "por año";
}

function movementPointsAsc(movements: StockMovementRow[]): StockBalanceChartPoint[] {
  const pts: StockBalanceChartPoint[] = [];
  for (const m of movements) {
    if (m.balanceAfter == null || !Number.isFinite(Number(m.balanceAfter))) {
      continue;
    }
    const t = new Date(m.createdAt).getTime();
    if (!Number.isFinite(t)) {
      continue;
    }
    const at = m.createdAt;
    pts.push({
      t,
      at,
      label: formatShortDate(at),
      value: Number(m.balanceAfter),
    });
  }
  pts.sort((a, b) => a.t - b.t);
  return pts;
}

function bucketSeries(points: StockBalanceChartPoint[], bucketMs: number): StockBalanceChartPoint[] {
  if (points.length === 0) {
    return [];
  }
  const start = points[0].t;
  const end = points[points.length - 1].t;
  const buckets: StockBalanceChartPoint[] = [];
  let cursor = Math.floor(start / bucketMs) * bucketMs;
  let idx = 0;
  let last: StockBalanceChartPoint | null = null;

  while (cursor <= end + bucketMs) {
    const bucketEnd = cursor + bucketMs;
    while (idx < points.length && points[idx].t < bucketEnd) {
      last = points[idx];
      idx += 1;
    }
    if (last != null) {
      const at = new Date(cursor).toISOString();
      buckets.push({
        t: cursor,
        at,
        label: formatShortDate(at),
        value: last.value,
      });
    }
    cursor += bucketMs;
  }

  const lastPoint = points[points.length - 1];
  if (
    buckets.length === 0 ||
    buckets[buckets.length - 1].t !== lastPoint.t ||
    buckets[buckets.length - 1].value !== lastPoint.value
  ) {
    buckets.push(lastPoint);
  }

  return buckets;
}

export function buildStorageBalanceSeries(input: {
  storageId: string;
  storageName: string;
  movements: StockMovementRow[];
  currentQuantity: number;
  bucketMs: number;
}): StockBalanceChartSeriesLine {
  const asc = movementPointsAsc(input.movements);
  const now = Date.now();
  const withNow: StockBalanceChartPoint[] = [
    ...asc,
    {
      t: now,
      at: new Date(now).toISOString(),
      label: formatShortDate(new Date(now).toISOString()),
      value: Math.max(0, Number(input.currentQuantity) || 0),
    },
  ];
  const deduped =
    withNow.length <= 2
      ? withNow
      : bucketSeries(withNow, input.bucketMs);

  return {
    key: input.storageId,
    label: input.storageName,
    points: deduped,
  };
}

export function buildVariantStockBalanceChart(input: {
  storages: Array<{
    storageId: string;
    storageName: string;
    quantity: number;
    movements: StockMovementRow[];
    movementsTotal: number;
  }>;
}): {
  seriesLines: StockBalanceChartSeriesLine[];
  meta: StockBalanceChartMeta | null;
} {
  const allTimes: number[] = [];
  let movementsUsed = 0;
  let movementsTotal = 0;

  for (const s of input.storages) {
    movementsUsed += s.movements.length;
    movementsTotal += s.movementsTotal;
    for (const m of s.movements) {
      const t = new Date(m.createdAt).getTime();
      if (Number.isFinite(t)) {
        allTimes.push(t);
      }
    }
  }

  const hasStock = input.storages.some((s) => Number(s.quantity) > 0);
  if (allTimes.length === 0 && !hasStock) {
    return { seriesLines: [], meta: null };
  }

  const now = Date.now();
  const fromT = allTimes.length > 0 ? Math.min(...allTimes) : now - DAY_MS;
  const toT = now;
  const span = Math.max(HOUR_MS, toT - fromT);
  const bucketMs = chooseBucketIntervalMs(span);

  const seriesLines = input.storages
    .map((s) =>
      buildStorageBalanceSeries({
        storageId: s.storageId,
        storageName: s.storageName,
        movements: s.movements,
        currentQuantity: s.quantity,
        bucketMs,
      }),
    )
    .filter((line) => line.points.length > 0);

  return {
    seriesLines,
    meta: {
      from: new Date(fromT).toISOString(),
      to: new Date(toT).toISOString(),
      bucketLabel: bucketIntervalLabel(bucketMs),
      movementsUsed,
      movementsTotal,
    },
  };
}
