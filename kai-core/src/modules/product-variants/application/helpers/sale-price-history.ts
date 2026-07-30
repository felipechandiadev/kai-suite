import type {
  SalePriceHistoryEntry,
  SalePriceHistorySource,
} from '../../domain/sale-price-history.types';

/** Máximo de entradas conservadas (las más recientes). */
export const SALE_PRICE_HISTORY_MAX_ENTRIES = 500;

export type SalePriceSnapshot = {
  priceListId: string;
  priceListName?: string;
  netPrice: number;
  grossPrice: number;
  taxIds?: string[] | null;
};

export type RecordSalePriceHistoryInput = {
  existing: SalePriceHistoryEntry[] | null | undefined;
  previousItems: SalePriceSnapshot[];
  nextItems: SalePriceSnapshot[];
  previousBasePrice: number;
  nextBasePrice: number;
  source: SalePriceHistorySource;
  userId?: string | null;
  at?: string;
};

function roundMoney(n: number): number {
  const x = Number(n);
  if (!Number.isFinite(x)) {
    return 0;
  }
  return Math.round(x);
}

function normalizeTaxIds(raw: string[] | null | undefined): string[] {
  if (!raw || !Array.isArray(raw)) {
    return [];
  }
  return [...raw].map(String).filter(Boolean).sort();
}

function taxIdsEqual(
  a: string[] | null | undefined,
  b: string[] | null | undefined,
): boolean {
  const aa = normalizeTaxIds(a);
  const bb = normalizeTaxIds(b);
  if (aa.length !== bb.length) {
    return false;
  }
  return aa.every((id, i) => id === bb[i]);
}

function normalizeList(
  existing: SalePriceHistoryEntry[] | null | undefined,
): SalePriceHistoryEntry[] {
  if (!existing || !Array.isArray(existing)) {
    return [];
  }
  return existing.filter(
    (e) =>
      e &&
      typeof e === 'object' &&
      typeof (e as SalePriceHistoryEntry).at === 'string' &&
      typeof (e as SalePriceHistoryEntry).source === 'string',
  ) as SalePriceHistoryEntry[];
}

function trimHistory(entries: SalePriceHistoryEntry[]): SalePriceHistoryEntry[] {
  if (entries.length <= SALE_PRICE_HISTORY_MAX_ENTRIES) {
    return entries;
  }
  return entries.slice(-SALE_PRICE_HISTORY_MAX_ENTRIES);
}

function appendEntry(
  list: SalePriceHistoryEntry[],
  entry: Omit<SalePriceHistoryEntry, 'at'> & { at?: string },
): SalePriceHistoryEntry[] {
  const row: SalePriceHistoryEntry = {
    at: entry.at ?? new Date().toISOString(),
    source: entry.source,
  };
  if (entry.userId) {
    row.userId = entry.userId;
  }
  if (entry.priceListId) {
    row.priceListId = entry.priceListId;
  }
  if (entry.priceListName?.trim()) {
    row.priceListName = entry.priceListName.trim();
  }
  if (entry.previousNet != null) {
    row.previousNet = entry.previousNet;
  }
  if (entry.newNet != null) {
    row.newNet = entry.newNet;
  }
  if (entry.previousGross != null) {
    row.previousGross = entry.previousGross;
  }
  if (entry.newGross != null) {
    row.newGross = entry.newGross;
  }
  if (entry.previousTaxIds !== undefined) {
    row.previousTaxIds = entry.previousTaxIds;
  }
  if (entry.newTaxIds !== undefined) {
    row.newTaxIds = entry.newTaxIds;
  }
  if (entry.previousBasePrice != null) {
    row.previousBasePrice = entry.previousBasePrice;
  }
  if (entry.newBasePrice != null) {
    row.newBasePrice = entry.newBasePrice;
  }
  return trimHistory([...list, row]);
}

function snapshotFromItem(item: SalePriceSnapshot): SalePriceSnapshot {
  return {
    priceListId: String(item.priceListId).trim(),
    priceListName: item.priceListName?.trim() || undefined,
    netPrice: roundMoney(item.netPrice),
    grossPrice: roundMoney(item.grossPrice),
    taxIds: normalizeTaxIds(item.taxIds),
  };
}

/**
 * Registra cambios de precios por lista y/o precio base de referencia.
 */
export function recordSalePriceHistory(
  input: RecordSalePriceHistoryInput,
): SalePriceHistoryEntry[] {
  let list = normalizeList(input.existing);
  const at = input.at ?? new Date().toISOString();
  const userId = input.userId?.trim() || undefined;
  const source = input.source;

  const prevByList = new Map<string, SalePriceSnapshot>();
  for (const item of input.previousItems) {
    const s = snapshotFromItem(item);
    if (s.priceListId) {
      prevByList.set(s.priceListId, s);
    }
  }

  const nextByList = new Map<string, SalePriceSnapshot>();
  for (const item of input.nextItems) {
    const s = snapshotFromItem(item);
    if (s.priceListId) {
      nextByList.set(s.priceListId, s);
    }
  }

  for (const [priceListId, next] of nextByList) {
    const prev = prevByList.get(priceListId);
    const prevNet = prev ? prev.netPrice : undefined;
    const prevGross = prev ? prev.grossPrice : undefined;
    const prevTax = prev ? prev.taxIds : undefined;

    const netChanged = prevNet === undefined || prevNet !== next.netPrice;
    const grossChanged = prevGross === undefined || prevGross !== next.grossPrice;
    const taxChanged = prev === undefined || !taxIdsEqual(prevTax, next.taxIds);

    if (!netChanged && !grossChanged && !taxChanged) {
      continue;
    }

    list = appendEntry(list, {
      at,
      source,
      userId,
      priceListId,
      priceListName: next.priceListName ?? prev?.priceListName,
      previousNet: prevNet,
      newNet: next.netPrice,
      previousGross: prevGross,
      newGross: next.grossPrice,
      previousTaxIds: prevTax ?? null,
      newTaxIds: next.taxIds ?? null,
    });
  }

  const prevBase = roundMoney(input.previousBasePrice);
  const nextBase = roundMoney(input.nextBasePrice);
  if (prevBase !== nextBase) {
    list = appendEntry(list, {
      at,
      source,
      userId,
      previousBasePrice: prevBase,
      newBasePrice: nextBase,
    });
  }

  return list;
}

export function filterSalePriceHistory(
  entries: SalePriceHistoryEntry[] | null | undefined,
  opts: { priceListId?: string; limit?: number },
): SalePriceHistoryEntry[] {
  let rows = normalizeList(entries);
  const plId = opts.priceListId?.trim();
  if (plId) {
    rows = rows.filter((e) => e.priceListId === plId);
  }
  rows.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  const limit = opts.limit != null ? Math.min(500, Math.max(1, opts.limit)) : 100;
  return rows.slice(0, limit);
}
