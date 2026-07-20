import { PRIMARY_BANK_ACCOUNT_KEY } from './config';

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

export type SeedSaleDoc = {
  daysAgo: number;
  /** null = venta mostrador sin cliente. */
  customerDoc: string | null;
  posName: 'Caja 1' | 'Caja 2';
  paymentMethod: SeedSalePaymentMethod;
  lines: SeedSaleLine[];
};

/**
 * Ventas ancladas a SKUs comprados en SEED_DEMO_PURCHASE_PLAN.
 * daysAgo siempre menor que la recepción que abastece el SKU.
 */
export const SEED_DEMO_SALES_PLAN: SeedSaleDoc[] = [
  {
    daysAgo: 80,
    customerDoc: null,
    posName: 'Caja 1',
    paymentMethod: 'CASH',
    lines: [{ sku: 'SEEDDEVCAFE1KG', qty: 2, unitPriceNet: 8990 }],
  },
  {
    daysAgo: 78,
    customerDoc: '16.345.789-2',
    posName: 'Caja 1',
    paymentMethod: 'DEBIT_CARD',
    lines: [
      { sku: 'SEEDDEVGAL400', qty: 3, unitPriceNet: 1990 },
      { sku: 'SEEDDEVCAFE1KG', qty: 1, unitPriceNet: 8990 },
    ],
  },
  {
    daysAgo: 70,
    customerDoc: '18.999.111-K',
    posName: 'Caja 2',
    paymentMethod: 'CREDIT_CARD',
    lines: [
      { sku: 'SEEDDEVPOLS', qty: 1, unitPriceNet: 12490 },
      { sku: 'SEEDDEVPOLM', qty: 1, unitPriceNet: 12990 },
    ],
  },
  {
    daysAgo: 65,
    customerDoc: null,
    posName: 'Caja 1',
    paymentMethod: 'CASH',
    lines: [
      { sku: 'SEEDDEVCUAROJ', qty: 4, unitPriceNet: 1990 },
      { sku: 'SEEDDEVMOCNEGNYL', qty: 1, unitPriceNet: 24990 },
    ],
  },
  {
    daysAgo: 55,
    customerDoc: '76.555.222-K',
    posName: 'Caja 1',
    paymentMethod: 'TRANSFER',
    lines: [{ sku: 'SEEDDEVCAFE500', qty: 10, unitPriceNet: 4990 }],
  },
  {
    daysAgo: 50,
    customerDoc: null,
    posName: 'Caja 2',
    paymentMethod: 'CASH',
    lines: [{ sku: 'SEEDDEVCAFE500', qty: 2, unitPriceNet: 4990 }],
  },
  {
    daysAgo: 42,
    customerDoc: '14.555.222-7',
    posName: 'Caja 1',
    paymentMethod: 'DEBIT_CARD',
    lines: [{ sku: 'SEEDDEVCALSNEG', qty: 6, unitPriceNet: 2990 }],
  },
  {
    daysAgo: 40,
    customerDoc: null,
    posName: 'Caja 2',
    paymentMethod: 'CHECK',
    lines: [
      { sku: 'SEEDDEVTE20', qty: 4, unitPriceNet: 2490 },
      { sku: 'SEEDDEVHDMI2', qty: 2, unitPriceNet: 5990 },
    ],
  },
  {
    daysAgo: 35,
    customerDoc: '77.888.123-4',
    posName: 'Caja 1',
    paymentMethod: 'TRANSFER',
    lines: [
      { sku: 'SEEDDEVTE20', qty: 8, unitPriceNet: 2490 },
      { sku: 'SEEDDEVHDMI2', qty: 3, unitPriceNet: 5990 },
    ],
  },
  {
    daysAgo: 25,
    customerDoc: '16.345.789-2',
    posName: 'Caja 1',
    paymentMethod: 'CREDIT_CARD',
    lines: [{ sku: 'SEEDDEVCAFE1KG', qty: 3, unitPriceNet: 8990 }],
  },
  {
    daysAgo: 22,
    customerDoc: null,
    posName: 'Caja 2',
    paymentMethod: 'CASH',
    lines: [{ sku: 'SEEDDEVCAFE1KG', qty: 1, unitPriceNet: 8990 }],
  },
  {
    daysAgo: 18,
    customerDoc: '18.999.111-K',
    posName: 'Caja 1',
    paymentMethod: 'DEBIT_CARD',
    lines: [{ sku: 'SEEDDEVPOLS', qty: 2, unitPriceNet: 12490 }],
  },
  {
    daysAgo: 12,
    customerDoc: null,
    posName: 'Caja 1',
    paymentMethod: 'CASH',
    lines: [
      { sku: 'SEEDDEVCAFE250', qty: 5, unitPriceNet: 2790 },
      { sku: 'SEEDDEVGAL400', qty: 2, unitPriceNet: 1990 },
    ],
  },
  {
    daysAgo: 10,
    customerDoc: '76.555.222-K',
    posName: 'Caja 2',
    paymentMethod: 'TRANSFER',
    lines: [{ sku: 'SEEDDEVCAFE250', qty: 12, unitPriceNet: 2790 }],
  },
  {
    daysAgo: 6,
    customerDoc: null,
    posName: 'Caja 1',
    paymentMethod: 'DEBIT_CARD',
    lines: [
      { sku: 'SEEDDEVTOABLA', qty: 2, unitPriceNet: 8990 },
      { sku: 'SEEDDEVCUAROJ', qty: 3, unitPriceNet: 1990 },
    ],
  },
  {
    daysAgo: 4,
    customerDoc: '14.555.222-7',
    posName: 'Caja 1',
    paymentMethod: 'CREDIT_CARD',
    lines: [{ sku: 'SEEDDEVTOABLA', qty: 1, unitPriceNet: 8990 }],
  },
  {
    daysAgo: 2,
    customerDoc: null,
    posName: 'Caja 2',
    paymentMethod: 'CASH',
    lines: [
      { sku: 'SEEDDEVCUAROJ', qty: 2, unitPriceNet: 1990 },
      { sku: 'SEEDDEVCAFE250', qty: 2, unitPriceNet: 2790 },
    ],
  },
  {
    daysAgo: 1,
    customerDoc: '16.345.789-2',
    posName: 'Caja 1',
    paymentMethod: 'TRANSFER',
    lines: [{ sku: 'SEEDDEVHDMI2', qty: 1, unitPriceNet: 5990 }],
  },
];

export { PRIMARY_BANK_ACCOUNT_KEY };
