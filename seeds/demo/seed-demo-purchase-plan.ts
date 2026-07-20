import {
  SEED_STORAGE_CODE,
  SEED_STORAGE_PASTELERIA_CODE,
} from './config';

export type SeedPurchaseLine = {
  sku: string;
  qty: number;
  unitCost: number;
};

export type SeedPurchasePaymentStrategy =
  | 'transfer'
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

/** ~12 recepciones en 90 días; unitCost anclado a baseCost del catálogo (± variación en recompras). */
export const SEED_DEMO_PURCHASE_PLAN: SeedPurchaseDoc[] = [
  {
    daysAgo: 88,
    supplierAlias: 'Mayorista Central',
    storageCode: SEED_STORAGE_CODE,
    reference: 'F-SEED-8801',
    paymentStrategy: 'transfer',
    lines: [
      { sku: 'SEEDDEVCAFE1KG', qty: 15, unitCost: 4000 },
      { sku: 'SEEDDEVGAL400', qty: 40, unitCost: 900 },
    ],
  },
  {
    daysAgo: 82,
    supplierAlias: 'TextilSur',
    storageCode: SEED_STORAGE_CODE,
    reference: 'F-SEED-8201',
    paymentStrategy: 'installments_2',
    lines: [
      { sku: 'SEEDDEVPOLS', qty: 8, unitCost: 5800 },
      { sku: 'SEEDDEVPOLM', qty: 8, unitCost: 6000 },
    ],
  },
  {
    daysAgo: 75,
    supplierAlias: 'Andes',
    storageCode: SEED_STORAGE_CODE,
    reference: 'F-SEED-7501',
    paymentStrategy: 'transfer',
    lines: [
      { sku: 'SEEDDEVCUAROJ', qty: 30, unitCost: 800 },
      { sku: 'SEEDDEVMOCNEGNYL', qty: 6, unitCost: 12000 },
    ],
  },
  {
    daysAgo: 58,
    supplierAlias: 'Mayorista Central',
    storageCode: SEED_STORAGE_CODE,
    reference: 'F-SEED-5801',
    paymentStrategy: 'installments_3',
    lines: [{ sku: 'SEEDDEVCAFE500', qty: 50, unitCost: 2200 }],
  },
  {
    daysAgo: 52,
    supplierAlias: 'Mayorista Central',
    storageCode: SEED_STORAGE_PASTELERIA_CODE,
    reference: 'F-SEED-5201',
    paymentStrategy: 'transfer',
    lines: [
      { sku: 'SEEDDEVHAR25', qty: 3, unitCost: 12000 },
      { sku: 'SEEDDEVACE1L', qty: 8, unitCost: 5200 },
    ],
  },
  {
    daysAgo: 45,
    supplierAlias: 'TextilSur',
    storageCode: SEED_STORAGE_CODE,
    reference: 'F-SEED-4501',
    paymentStrategy: 'installments_2',
    lines: [{ sku: 'SEEDDEVCALSNEG', qty: 60, unitCost: 1200 }],
  },
  {
    daysAgo: 38,
    supplierAlias: 'Andes',
    storageCode: SEED_STORAGE_CODE,
    reference: 'F-SEED-3801',
    paymentStrategy: 'transfer',
    lines: [
      { sku: 'SEEDDEVTE20', qty: 35, unitCost: 1100 },
      { sku: 'SEEDDEVHDMI2', qty: 20, unitCost: 2500 },
    ],
  },
  {
    daysAgo: 28,
    supplierAlias: 'Mayorista Central',
    storageCode: SEED_STORAGE_CODE,
    reference: 'F-SEED-2801',
    paymentStrategy: 'installments_3',
    lines: [{ sku: 'SEEDDEVCAFE1KG', qty: 20, unitCost: 4200 }],
  },
  {
    daysAgo: 21,
    supplierAlias: 'Mayorista Central',
    storageCode: SEED_STORAGE_PASTELERIA_CODE,
    reference: 'F-SEED-2101',
    paymentStrategy: 'transfer',
    lines: [
      { sku: 'SEEDDEVINSCARNE', qty: 10, unitCost: 5200 },
      { sku: 'SEEDDEVINSPAPA', qty: 15, unitCost: 1600 },
    ],
  },
  {
    daysAgo: 14,
    supplierAlias: 'TextilSur',
    storageCode: SEED_STORAGE_CODE,
    reference: 'F-SEED-1401',
    paymentStrategy: 'installments_2',
    lines: [{ sku: 'SEEDDEVPOLS', qty: 10, unitCost: 6300 }],
  },
  {
    daysAgo: 7,
    supplierAlias: 'Mayorista Central',
    storageCode: SEED_STORAGE_CODE,
    reference: 'F-SEED-0701',
    paymentStrategy: 'transfer',
    lines: [{ sku: 'SEEDDEVCAFE250', qty: 80, unitCost: 1150 }],
  },
  {
    daysAgo: 3,
    supplierAlias: 'Andes',
    storageCode: SEED_STORAGE_CODE,
    reference: 'F-SEED-0301',
    paymentStrategy: 'installments_3',
    lines: [
      { sku: 'SEEDDEVTOABLA', qty: 15, unitCost: 4500 },
      { sku: 'SEEDDEVCUAROJ', qty: 20, unitCost: 820 },
    ],
  },
];
