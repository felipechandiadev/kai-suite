import {
  SEED_STORAGE_CODE,
  SEED_STORAGE_PASTELERIA_CODE,
} from './config';
import { collectSeedDevPhysicalVariants } from './catalog';

export type SeedPurchaseLine = {
  sku: string;
  qty: number;
  unitCost: number;
};

export type SeedPurchasePaymentStrategy =
  | 'transfer'
  | 'check'
  | 'installments_2'
  | 'installments_3';

export type SeedPurchaseDoc = {
  daysAgo: number;
  supplierAlias: string;
  storageCode: string;
  reference: string;
  paymentStrategy: SeedPurchasePaymentStrategy;
  lines: SeedPurchaseLine[];
};

export type SeedPhysicalVariantInput = {
  sku: string;
  baseCost: number;
};

const SUPPLIERS = ['Mayorista Central', 'TextilSur', 'Andes'] as const;

/** Recepciones fijas de insumos a pastelería (cocina demo). */
const INSUMO_PASTELERIA_DOCS: SeedPurchaseDoc[] = [
  {
    daysAgo: 160,
    supplierAlias: 'Mayorista Central',
    storageCode: SEED_STORAGE_PASTELERIA_CODE,
    reference: 'F-SEED-INS-1601',
    paymentStrategy: 'transfer',
    lines: [
      { sku: 'SEEDDEVHAR25', qty: 4, unitCost: 12000 },
      { sku: 'SEEDDEVACE1L', qty: 10, unitCost: 5200 },
    ],
  },
  {
    daysAgo: 75,
    supplierAlias: 'Mayorista Central',
    storageCode: SEED_STORAGE_PASTELERIA_CODE,
    reference: 'F-SEED-INS-7501',
    paymentStrategy: 'transfer',
    lines: [
      { sku: 'SEEDDEVHAR25', qty: 3, unitCost: 12200 },
      { sku: 'SEEDDEVACE1L', qty: 8, unitCost: 5300 },
    ],
  },
  {
    daysAgo: 21,
    supplierAlias: 'Mayorista Central',
    storageCode: SEED_STORAGE_PASTELERIA_CODE,
    reference: 'F-SEED-INS-2101',
    paymentStrategy: 'check',
    lines: [
      { sku: 'SEEDDEVINSCARNE', qty: 12, unitCost: 5200 },
      { sku: 'SEEDDEVINSPAPA', qty: 18, unitCost: 1600 },
    ],
  },
];

/** Recepciones de insumos textiles (taller / manufacturados). */
const INSUMO_TEXTIL_DOCS: SeedPurchaseDoc[] = [
  {
    daysAgo: 90,
    supplierAlias: 'TextilSur',
    storageCode: SEED_STORAGE_CODE,
    reference: 'F-SEED-TXT-9001',
    paymentStrategy: 'transfer',
    lines: [
      { sku: 'SEEDDEVINSTELAALG', qty: 80, unitCost: 2800 },
      { sku: 'SEEDDEVINSTELAPOL', qty: 40, unitCost: 4200 },
      { sku: 'SEEDDEVINSHILO', qty: 50, unitCost: 450 },
      { sku: 'SEEDDEVINSBOTON', qty: 200, unitCost: 80 },
      { sku: 'SEEDDEVINSETIQ', qty: 150, unitCost: 120 },
    ],
  },
  {
    daysAgo: 28,
    supplierAlias: 'TextilSur',
    storageCode: SEED_STORAGE_CODE,
    reference: 'F-SEED-TXT-2801',
    paymentStrategy: 'check',
    lines: [
      { sku: 'SEEDDEVINSTELAALG', qty: 45, unitCost: 2850 },
      { sku: 'SEEDDEVINSTELAPOL', qty: 25, unitCost: 4300 },
      { sku: 'SEEDDEVINSHILO', qty: 30, unitCost: 460 },
      { sku: 'SEEDDEVINSBOTON', qty: 100, unitCost: 85 },
      { sku: 'SEEDDEVINSETIQ', qty: 80, unitCost: 125 },
    ],
  },
];

/**
 * Recepciones de insumos cocina para PREPARADO (hamburguesa, papas, completo, combo).
 * Bodega principal = input de UP Cocina DEPENDENT.
 */
const INSUMO_COCINA_PREPARADO_DOCS: SeedPurchaseDoc[] = [
  {
    daysAgo: 100,
    supplierAlias: 'Mayorista Central',
    storageCode: SEED_STORAGE_CODE,
    reference: 'F-SEED-PREP-1001',
    paymentStrategy: 'transfer',
    lines: [
      { sku: 'SEEDDEVINSPANHAMB', qty: 120, unitCost: 120 },
      { sku: 'SEEDDEVINSCARNE', qty: 25, unitCost: 5200 },
      { sku: 'SEEDDEVINSPAPA', qty: 40, unitCost: 1600 },
      { sku: 'SEEDDEVINSQUESO', qty: 200, unitCost: 150 },
      { sku: 'SEEDDEVACE1L', qty: 12, unitCost: 5200 },
    ],
  },
  {
    daysAgo: 55,
    supplierAlias: 'Mayorista Central',
    storageCode: SEED_STORAGE_CODE,
    reference: 'F-SEED-PREP-5501',
    paymentStrategy: 'installments_2',
    lines: [
      { sku: 'SEEDDEVINSPANHOT', qty: 100, unitCost: 100 },
      { sku: 'SEEDDEVINSSALCHI', qty: 100, unitCost: 220 },
      { sku: 'SEEDDEVINSPANHAMB', qty: 80, unitCost: 125 },
      { sku: 'SEEDDEVINSCARNE', qty: 18, unitCost: 5300 },
    ],
  },
  {
    daysAgo: 14,
    supplierAlias: 'Andes',
    storageCode: SEED_STORAGE_CODE,
    reference: 'F-SEED-PREP-1401',
    paymentStrategy: 'check',
    lines: [
      { sku: 'SEEDDEVINSPAPA', qty: 30, unitCost: 1650 },
      { sku: 'SEEDDEVINSQUESO', qty: 150, unitCost: 155 },
      { sku: 'SEEDDEVINSSALCHI', qty: 60, unitCost: 230 },
      { sku: 'SEEDDEVINSPANHOT', qty: 60, unitCost: 105 },
      { sku: 'SEEDDEVACE500', qty: 20, unitCost: 2800 },
    ],
  },
];

const TARGET_RECENT = 36;
const TARGET_OLDER = 12;
const HORIZON_DAYS = 180;
const RECENT_WINDOW = 90;

function paymentStrategyForIndex(index: number): SeedPurchasePaymentStrategy {
  const slot = index % 10;
  if (slot < 4) return 'transfer';
  if (slot < 6) return 'check';
  if (slot < 8) return 'installments_2';
  return 'installments_3';
}

function costWithDrift(baseCost: number, docIndex: number, lineIndex: number): number {
  const factors = [0.95, 0.98, 1.0, 1.03, 1.05, 1.08];
  const factor = factors[(docIndex + lineIndex) % factors.length]!;
  return Math.max(1, Math.round(baseCost * factor));
}

function qtyForSku(sku: string, docIndex: number): number {
  const base = 5 + (docIndex % 12);
  if (sku.includes('CAFE') || sku.includes('TE') || sku.includes('GAL')) {
    return base * 4;
  }
  if (sku.includes('CALS') || sku.includes('CUA')) {
    return base * 3;
  }
  if (sku.includes('MOC') || sku.includes('TOA')) {
    return Math.max(4, Math.floor(base / 2));
  }
  return base * 2;
}

function uniqueReference(daysAgo: number, seq: number): string {
  return `F-SEED-${String(daysAgo).padStart(3, '0')}${String(seq).padStart(2, '0')}`;
}

function daysAgoForCoverage(index: number, total: number): number {
  if (total <= 1) return Math.floor(HORIZON_DAYS / 2);
  // Spread across 180 days, denser toward recent half via later fill step.
  const t = index / (total - 1);
  return Math.max(1, Math.round(1 + t * (HORIZON_DAYS - 1)));
}

function daysAgoForFill(slot: number, recent: boolean): number {
  if (recent) {
    return 1 + (slot % RECENT_WINDOW);
  }
  const olderSpan = HORIZON_DAYS - RECENT_WINDOW;
  return RECENT_WINDOW + 1 + (slot % olderSpan);
}

/**
 * Plan determinista: cobertura 100% PHYSICAL + densidad ×3 en 90d + insumos pastelería.
 * ~36 docs recientes + ~12 antiguos (+ 3 insumos).
 */
export function buildSeedDemoPurchasePlan(
  physicalVariants?: SeedPhysicalVariantInput[],
): SeedPurchaseDoc[] {
  const variants =
    physicalVariants?.length && physicalVariants.length > 0
      ? [...physicalVariants]
      : collectSeedDevPhysicalVariants();

  if (!variants.length) {
    throw new Error('buildSeedDemoPurchasePlan: no hay variantes PHYSICAL');
  }

  variants.sort((a, b) => a.sku.localeCompare(b.sku));

  const docs: SeedPurchaseDoc[] = [];
  const usedRefs = new Set<string>();
  let seq = 0;

  const pushDoc = (partial: Omit<SeedPurchaseDoc, 'reference'> & { reference?: string }) => {
    seq += 1;
    let reference = partial.reference ?? uniqueReference(partial.daysAgo, seq);
    while (usedRefs.has(reference)) {
      seq += 1;
      reference = uniqueReference(partial.daysAgo, seq);
    }
    usedRefs.add(reference);
    docs.push({ ...partial, reference });
  };

  // 1) Cobertura: una compra mínima por variante PHYSICAL
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i]!;
    const daysAgo = daysAgoForCoverage(i, variants.length);
    pushDoc({
      daysAgo,
      supplierAlias: SUPPLIERS[i % SUPPLIERS.length]!,
      storageCode: SEED_STORAGE_CODE,
      paymentStrategy: paymentStrategyForIndex(i),
      lines: [
        {
          sku: v.sku,
          qty: qtyForSku(v.sku, i),
          unitCost: costWithDrift(v.baseCost, i, 0),
        },
      ],
    });
  }

  const countRecent = () => docs.filter((d) => d.daysAgo <= RECENT_WINDOW).length;
  const countOlder = () =>
    docs.filter((d) => d.daysAgo > RECENT_WINDOW && d.daysAgo <= HORIZON_DAYS).length;

  // 2) Rellenar densidad reciente (1–90)
  let fillIdx = 0;
  while (countRecent() < TARGET_RECENT) {
    const i = fillIdx++;
    const primary = variants[i % variants.length]!;
    const secondary = variants[(i + 7) % variants.length]!;
    const tertiary = variants[(i + 13) % variants.length]!;
    const daysAgo = daysAgoForFill(i, true);
    const lineCount = 1 + (i % 3);
    const lineVariants = [primary, secondary, tertiary].slice(0, lineCount);
    pushDoc({
      daysAgo,
      supplierAlias: SUPPLIERS[i % SUPPLIERS.length]!,
      storageCode: SEED_STORAGE_CODE,
      paymentStrategy: paymentStrategyForIndex(variants.length + i),
      lines: lineVariants.map((v, li) => ({
        sku: v.sku,
        qty: qtyForSku(v.sku, variants.length + i + li),
        unitCost: costWithDrift(v.baseCost, variants.length + i, li),
      })),
    });
    if (fillIdx > 500) break;
  }

  // 3) Rellenar ventana antigua (91–180)
  fillIdx = 0;
  while (countOlder() < TARGET_OLDER) {
    const i = fillIdx++;
    const primary = variants[(i + 3) % variants.length]!;
    const secondary = variants[(i + 11) % variants.length]!;
    const daysAgo = daysAgoForFill(i, false);
    const lineCount = 1 + (i % 2);
    const lineVariants = [primary, secondary].slice(0, lineCount);
    pushDoc({
      daysAgo,
      supplierAlias: SUPPLIERS[(i + 1) % SUPPLIERS.length]!,
      storageCode: SEED_STORAGE_CODE,
      paymentStrategy: paymentStrategyForIndex(variants.length * 2 + i),
      lines: lineVariants.map((v, li) => ({
        sku: v.sku,
        qty: qtyForSku(v.sku, 200 + i + li),
        unitCost: costWithDrift(v.baseCost, 200 + i, li),
      })),
    });
    if (fillIdx > 200) break;
  }

  // 4) Insumos pastelería (fijos)
  for (const insumo of INSUMO_PASTELERIA_DOCS) {
    pushDoc({ ...insumo });
  }

  // 5) Insumos textil / taller (fijos)
  for (const insumo of INSUMO_TEXTIL_DOCS) {
    pushDoc({ ...insumo });
  }

  // 6) Insumos cocina PREPARADO (fijos → bodega principal / Cocina)
  for (const insumo of INSUMO_COCINA_PREPARADO_DOCS) {
    pushDoc({ ...insumo });
  }

  return docs.sort((a, b) => b.daysAgo - a.daysAgo || a.reference.localeCompare(b.reference));
}
