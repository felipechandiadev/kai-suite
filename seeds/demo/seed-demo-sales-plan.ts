import { PRIMARY_BANK_ACCOUNT_KEY, SEED_STORAGE_CODE } from './config';
import { collectSeedDevPhysicalSellableVariants } from './catalog';
import type { SeedPurchaseDoc } from './seed-demo-purchase-plan';

export type SeedSalePaymentMethod =
  | 'CASH'
  | 'DEBIT_CARD'
  | 'CREDIT_CARD'
  | 'TRANSFER'
  | 'CHECK';

export type SeedSaleLine = {
  sku: string;
  qty: number;
  /** Precio unitario neto (sin IVA). */
  unitPriceNet: number;
};

export type SeedSaleOperatorUserName = 'operador' | 'operador2' | 'operador3';

export type SeedSaleDoc = {
  daysAgo: number;
  /** null = venta mostrador sin cliente. */
  customerDoc: string | null;
  posName: 'Caja 1' | 'Caja 2';
  /** Usuario POS_OPERATOR que registra la venta (no admin). */
  operatorUserName: SeedSaleOperatorUserName;
  paymentMethod: SeedSalePaymentMethod;
  lines: SeedSaleLine[];
};

export type SeedSellableVariantInput = {
  sku: string;
  basePrice: number;
};

const HORIZON_DAYS = 180;
const RECENT_WINDOW = 90;
const TARGET_RECENT = 36;
const TARGET_OLDER = 12;

const CUSTOMER_DOCS = [
  '16.345.789-2',
  '18.999.111-K',
  '76.555.222-K',
  '14.555.222-7',
  '77.888.123-4',
] as const;

const PAYMENT_METHODS: SeedSalePaymentMethod[] = [
  'CASH',
  'DEBIT_CARD',
  'CREDIT_CARD',
  'TRANSFER',
  'CASH',
  'DEBIT_CARD',
  'TRANSFER',
  'CREDIT_CARD',
  'CASH',
  'CHECK',
];

type StockReceipt = { daysAgo: number; qty: number };

function paymentMethodForIndex(index: number): SeedSalePaymentMethod {
  return PAYMENT_METHODS[index % PAYMENT_METHODS.length]!;
}

function posAndOperatorForIndex(index: number): {
  posName: 'Caja 1' | 'Caja 2';
  operatorUserName: SeedSaleOperatorUserName;
} {
  if (index % 3 === 2) {
    return { posName: 'Caja 2', operatorUserName: 'operador3' };
  }
  return {
    posName: 'Caja 1',
    operatorUserName: index % 2 === 0 ? 'operador' : 'operador2',
  };
}

function customerDocForIndex(index: number): string | null {
  if (index % 2 === 0) return null;
  return CUSTOMER_DOCS[Math.floor(index / 2) % CUSTOMER_DOCS.length]!;
}

function buildReceiptsBySku(
  purchasePlan: SeedPurchaseDoc[],
): Map<string, StockReceipt[]> {
  const bySku = new Map<string, StockReceipt[]>();
  for (const doc of purchasePlan) {
    if (doc.storageCode !== SEED_STORAGE_CODE) continue;
    for (const line of doc.lines) {
      const list = bySku.get(line.sku) ?? [];
      list.push({ daysAgo: doc.daysAgo, qty: line.qty });
      bySku.set(line.sku, list);
    }
  }
  for (const list of bySku.values()) {
    list.sort((a, b) => b.daysAgo - a.daysAgo);
  }
  return bySku;
}

function stockAtSaleDay(
  receipts: StockReceipt[],
  saleDaysAgo: number,
  alreadySold: number,
): number {
  let purchased = 0;
  for (const r of receipts) {
    if (r.daysAgo > saleDaysAgo) purchased += r.qty;
  }
  return Math.max(0, purchased - alreadySold);
}

function qtyForSaleLine(sku: string, available: number, docIndex: number): number {
  if (available <= 0) return 0;
  const base = 1 + (docIndex % 6);
  let desired = base;
  if (sku.includes('CAFE') || sku.includes('TE') || sku.includes('GAL')) {
    desired = Math.min(available, 2 + (docIndex % 8));
  } else if (sku.includes('CALS') || sku.includes('CUA')) {
    desired = Math.min(available, 2 + (docIndex % 5));
  } else if (sku.includes('MOC') || sku.includes('TOA') || sku.includes('POL')) {
    desired = Math.min(available, 1 + (docIndex % 2));
  } else {
    desired = Math.min(available, base);
  }
  const cap = Math.max(1, Math.floor(available * 0.25));
  return Math.max(1, Math.min(desired, cap, available));
}

function tryBuildSale(opts: {
  daysAgo: number;
  docIndex: number;
  sellableSkus: string[];
  priceBySku: Map<string, number>;
  receiptsBySku: Map<string, StockReceipt[]>;
  soldQtyBySku: Map<string, number>;
}): SeedSaleDoc | null {
  const { daysAgo, docIndex, sellableSkus, priceBySku, receiptsBySku, soldQtyBySku } =
    opts;

  const candidates: Array<{ sku: string; available: number }> = [];
  for (const sku of sellableSkus) {
    const receipts = receiptsBySku.get(sku);
    if (!receipts?.length) continue;
    const sold = soldQtyBySku.get(sku) ?? 0;
    const available = stockAtSaleDay(receipts, daysAgo, sold);
    if (available > 0 && priceBySku.has(sku)) {
      candidates.push({ sku, available });
    }
  }
  if (!candidates.length) return null;

  candidates.sort((a, b) => b.available - a.available || a.sku.localeCompare(b.sku));
  const primary = candidates[docIndex % candidates.length]!;
  const secondary =
    candidates.length > 1
      ? candidates[(docIndex + 7) % candidates.length]!
      : null;

  const lineCount =
    secondary && secondary.sku !== primary.sku && docIndex % 3 !== 0 ? 2 : 1;
  const picked = lineCount === 2 ? [primary, secondary!] : [primary];
  const lines: SeedSaleLine[] = [];
  const usedInDoc = new Map<string, number>();

  for (let li = 0; li < picked.length; li++) {
    const { sku } = picked[li]!;
    const receipts = receiptsBySku.get(sku)!;
    const soldSoFar = (soldQtyBySku.get(sku) ?? 0) + (usedInDoc.get(sku) ?? 0);
    const availNow = stockAtSaleDay(receipts, daysAgo, soldSoFar);
    const qty = qtyForSaleLine(sku, availNow, docIndex + li);
    if (qty <= 0) continue;
    const unitPriceNet = priceBySku.get(sku);
    if (!unitPriceNet) continue;
    lines.push({ sku, qty, unitPriceNet });
    usedInDoc.set(sku, (usedInDoc.get(sku) ?? 0) + qty);
  }

  if (!lines.length) return null;

  const { posName, operatorUserName } = posAndOperatorForIndex(docIndex);
  return {
    daysAgo,
    customerDoc: customerDocForIndex(docIndex),
    posName,
    operatorUserName,
    paymentMethod: paymentMethodForIndex(docIndex),
    lines,
  };
}

function applySaleToSoldLedger(
  doc: SeedSaleDoc,
  soldQtyBySku: Map<string, number>,
): void {
  for (const line of doc.lines) {
    soldQtyBySku.set(line.sku, (soldQtyBySku.get(line.sku) ?? 0) + line.qty);
  }
}

/**
 * Días objetivo: 12 en 91–180 + 36 en 1–90 (más densos cerca de hoy).
 */
function buildTargetSaleDays(): { older: number[]; recent: number[] } {
  const older: number[] = [];
  for (let i = 0; i < TARGET_OLDER; i++) {
    const t = i / Math.max(1, TARGET_OLDER - 1);
    older.push(
      Math.round(RECENT_WINDOW + 1 + t * (HORIZON_DAYS - RECENT_WINDOW - 1)),
    );
  }

  const recent: number[] = [];
  const nearCount = 24;
  const midCount = TARGET_RECENT - nearCount;
  for (let i = 0; i < nearCount; i++) {
    const t = i / Math.max(1, nearCount - 1);
    recent.push(Math.max(1, Math.round(1 + t * 44)));
  }
  for (let i = 0; i < midCount; i++) {
    const t = i / Math.max(1, midCount - 1);
    recent.push(Math.round(46 + t * 44));
  }

  return {
    older: [...new Set(older)],
    recent: [...new Set(recent)],
  };
}

function reserveDays(exclude: Set<number>, from: number, to: number): number[] {
  const out: number[] = [];
  for (let d = from; d <= to; d++) {
    if (!exclude.has(d)) out.push(d);
  }
  return out;
}

/**
 * Plan determinista de ventas en el mismo horizonte que compras (180d).
 * Solo SKUs PHYSICAL vendibles con recepción en bodega principal;
 * `daysAgo` de venta siempre estrictamente menor que la recepción que abastece.
 * Densidad: ~36 recientes (≤90, sesgo a últimos 45d) + ~12 antiguas (91–180).
 * Generación cronológica (antiguo → reciente) para no sobrevender stock.
 */
export function buildSeedDemoSalesPlan(
  purchasePlan: SeedPurchaseDoc[],
  sellableVariants?: SeedSellableVariantInput[],
): SeedSaleDoc[] {
  const variants =
    sellableVariants?.length && sellableVariants.length > 0
      ? [...sellableVariants]
      : collectSeedDevPhysicalSellableVariants();

  if (!variants.length) {
    throw new Error('buildSeedDemoSalesPlan: no hay variantes PHYSICAL vendibles');
  }

  variants.sort((a, b) => a.sku.localeCompare(b.sku));
  const priceBySku = new Map(variants.map((v) => [v.sku, v.basePrice]));
  const sellableSkus = variants.map((v) => v.sku);
  const receiptsBySku = buildReceiptsBySku(purchasePlan);

  const targets = buildTargetSaleDays();
  let olderDays = [...targets.older];
  let recentDays = [...targets.recent];

  const generate = (older: number[], recent: number[]): SeedSaleDoc[] => {
    const soldQtyBySku = new Map<string, number>();
    const docs: SeedSaleDoc[] = [];
    let docIndex = 0;
    // Exactamente N días por ventana (recientes sesgados a hoy), luego cronológico.
    const olderPick = [...new Set(older)]
      .filter((d) => d > RECENT_WINDOW && d <= HORIZON_DAYS)
      .sort((a, b) => b - a)
      .slice(0, TARGET_OLDER);
    const recentPick = [...new Set(recent)]
      .filter((d) => d >= 1 && d <= RECENT_WINDOW)
      .sort((a, b) => a - b) // preferir cercanos a hoy al recortar
      .slice(0, TARGET_RECENT);

    for (const daysAgo of [...olderPick, ...recentPick].sort((a, b) => b - a)) {
      const sale = tryBuildSale({
        daysAgo,
        docIndex,
        sellableSkus,
        priceBySku,
        receiptsBySku,
        soldQtyBySku,
      });
      if (!sale) continue;
      applySaleToSoldLedger(sale, soldQtyBySku);
      docs.push(sale);
      docIndex += 1;
    }
    return docs;
  };

  let docs = generate(olderDays, recentDays);
  let guard = 0;
  while (guard < 8) {
    guard += 1;
    const recentOk = docs
      .filter((d) => d.daysAgo <= RECENT_WINDOW)
      .map((d) => d.daysAgo);
    const olderOk = docs
      .filter((d) => d.daysAgo > RECENT_WINDOW && d.daysAgo <= HORIZON_DAYS)
      .map((d) => d.daysAgo);
    if (recentOk.length >= TARGET_RECENT && olderOk.length >= TARGET_OLDER) break;

    const used = new Set([...olderOk, ...recentOk]);
    if (olderOk.length < TARGET_OLDER) {
      const reserve = reserveDays(used, RECENT_WINDOW + 1, HORIZON_DAYS);
      olderDays = [
        ...olderOk,
        ...reserve.slice(0, TARGET_OLDER - olderOk.length + 8),
      ];
    } else {
      olderDays = olderOk;
    }
    if (recentOk.length < TARGET_RECENT) {
      const near = reserveDays(used, 1, 45);
      const mid = reserveDays(used, 46, RECENT_WINDOW);
      const need = TARGET_RECENT - recentOk.length + 8;
      recentDays = [...recentOk, ...near.slice(0, need), ...mid.slice(0, need)];
    } else {
      recentDays = recentOk;
    }
    docs = generate(olderDays, recentDays);
  }

  return docs.sort((a, b) => b.daysAgo - a.daysAgo);
}

export {
  PRIMARY_BANK_ACCOUNT_KEY,
  HORIZON_DAYS,
  RECENT_WINDOW,
  TARGET_RECENT,
  TARGET_OLDER,
};
