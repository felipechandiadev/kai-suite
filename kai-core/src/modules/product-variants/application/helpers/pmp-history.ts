import type { PmpHistoryEntry, PmpHistorySource } from '../../domain/pmp-history.types';

/** Máximo de entradas conservadas (las más recientes). */
export const PMP_HISTORY_MAX_ENTRIES = 500;

function round2(n: number): number {
  const x = Number(n);
  if (!Number.isFinite(x)) {
    return 0;
  }
  return Math.round(x * 100) / 100;
}

function normalizeList(
  existing: PmpHistoryEntry[] | null | undefined,
): PmpHistoryEntry[] {
  if (!existing || !Array.isArray(existing)) {
    return [];
  }
  return existing.filter(
    (e) =>
      e &&
      typeof e === 'object' &&
      typeof (e as PmpHistoryEntry).at === 'string' &&
      typeof (e as PmpHistoryEntry).source === 'string',
  ) as PmpHistoryEntry[];
}

export type AppendPmpHistoryInput = Omit<PmpHistoryEntry, 'at'> & {
  at?: string;
  source: PmpHistorySource;
};

/**
 * Añade una entrada al historial de PMP si el valor efectivo cambió (2 decimales).
 * Devuelve un nuevo array acotado a {@link PMP_HISTORY_MAX_ENTRIES}.
 */
export function appendPmpHistory(
  existing: PmpHistoryEntry[] | null | undefined,
  entry: AppendPmpHistoryInput,
): PmpHistoryEntry[] {
  const prev = round2(entry.previousPmp);
  const next = round2(entry.newPmp);
  if (prev === next) {
    return normalizeList(existing);
  }

  const base: PmpHistoryEntry = {
    at: entry.at ?? new Date().toISOString(),
    previousPmp: prev,
    newPmp: next,
    source: entry.source,
  };
  if (entry.transactionId != null && entry.transactionId !== '') {
    base.transactionId = entry.transactionId;
  }
  if (entry.storageId != null && entry.storageId !== '') {
    base.storageId = entry.storageId;
  }
  if (entry.unitCost != null && Number.isFinite(entry.unitCost)) {
    base.unitCost = round2(Number(entry.unitCost));
  }
  if (entry.quantity != null && Number.isFinite(entry.quantity)) {
    base.quantity = Number(entry.quantity);
  }

  const merged = [...normalizeList(existing), base];
  if (merged.length > PMP_HISTORY_MAX_ENTRIES) {
    return merged.slice(-PMP_HISTORY_MAX_ENTRIES);
  }
  return merged;
}
