/**
 * Plan determinístico de tip-sales KaiFood (salón + propina).
 * Solo PHYSICAL food — stock del plan de compras retail.
 */

export type SeedTipPaymentMethod = 'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD';

export type SeedTipWaiterUserName = 'mesero1' | 'mesero2' | 'mesero3';

export type SeedTipOperatorUserName = 'operador' | 'operador2' | 'operador3';

export type SeedTipSaleDoc = {
  daysAgo: number;
  /** Índice 0..TARGET-1 — usado para pozo / overdue. */
  index: number;
  waiterUserName: SeedTipWaiterUserName;
  operatorUserName: SeedTipOperatorUserName;
  posName: 'Caja 1' | 'Caja 2';
  paymentMethod: SeedTipPaymentMethod;
  /** Si true, el ledger queda sin employeeId (pozo POOL). */
  leaveUnattributed: boolean;
  /** Mesa seed (código). */
  tableCode: string;
  lines: Array<{ sku: string; qty: number; unitPriceNet: number }>;
  /** Monto tip CLP (≈ 10% del total bruto de líneas). */
  tipAmount: number;
  tipSuggestedAmount: number;
};

export const TIP_SALE_TARGET = 30;
export const TIP_SALE_HORIZON_DAYS = 45;
export const TIP_SUGGEST_PERCENT = 10;
/** ~25% del plan sin atribuir. */
export const TIP_UNATTRIBUTED_EVERY = 4;
/** Tip tarjeta con dueAt vencido: daysAgo >= este umbral. */
export const TIP_OVERDUE_MIN_DAYS_AGO = 15;

const WAITERS: SeedTipWaiterUserName[] = ['mesero1', 'mesero2', 'mesero3'];
const OPERATORS: SeedTipOperatorUserName[] = [
  'operador',
  'operador2',
  'operador3',
];
const PAYMENTS: SeedTipPaymentMethod[] = [
  'CASH',
  'DEBIT_CARD',
  'CREDIT_CARD',
  'CASH',
  'DEBIT_CARD',
  'CREDIT_CARD',
];
const TABLE_CODES = ['M1', 'M2', 'M3', 'T1', 'T2', 'T3'] as const;

/** SKUs PHYSICAL food con precio neto típico del catálogo demo. */
const FOOD_PHYSICAL_SKUS: Array<{ sku: string; unitPriceNet: number }> = [
  { sku: 'SEEDDEVCAFE250', unitPriceNet: 2790 },
  { sku: 'SEEDDEVCAFE500', unitPriceNet: 4990 },
  { sku: 'SEEDDEVPHYSBEBCOLMED', unitPriceNet: 1290 },
  { sku: 'SEEDDEVPHYSBEBCOLGRA', unitPriceNet: 1590 },
  { sku: 'SEEDDEVPHYSBEBLIMMED', unitPriceNet: 1290 },
  { sku: 'SEEDDEVPHYSBEBNARMED', unitPriceNet: 1290 },
  { sku: 'SEEDDEVTE20', unitPriceNet: 2490 },
  { sku: 'SEEDDEVGAL400', unitPriceNet: 1990 },
];

function roundClp(n: number): number {
  return Math.round(Number(n) || 0);
}

function tipFromLines(
  lines: Array<{ qty: number; unitPriceNet: number }>,
): { tipAmount: number; tipSuggestedAmount: number; totalGross: number } {
  let subtotal = 0;
  for (const line of lines) {
    subtotal += roundClp(line.unitPriceNet * line.qty);
  }
  const tax = roundClp(subtotal * 0.19);
  const totalGross = subtotal + tax;
  const tipSuggestedAmount = roundClp((totalGross * TIP_SUGGEST_PERCENT) / 100);
  return {
    tipAmount: tipSuggestedAmount,
    tipSuggestedAmount,
    totalGross,
  };
}

/**
 * 30 tip-sales repartidas en ~45 días (más densas en los últimos 20).
 */
export function buildSeedDemoTipsPlan(): SeedTipSaleDoc[] {
  const docs: SeedTipSaleDoc[] = [];
  for (let i = 0; i < TIP_SALE_TARGET; i++) {
    // Reparto lineal 1..45 días (más recientes al inicio del índice).
    const daysAgo = Math.max(
      1,
      Math.min(
        TIP_SALE_HORIZON_DAYS,
        1 + Math.floor((i * (TIP_SALE_HORIZON_DAYS - 1)) / (TIP_SALE_TARGET - 1)),
      ),
    );

    const product = FOOD_PHYSICAL_SKUS[i % FOOD_PHYSICAL_SKUS.length]!;
    const second =
      FOOD_PHYSICAL_SKUS[(i + 3) % FOOD_PHYSICAL_SKUS.length]!;
    const lines =
      i % 3 === 0
        ? [
            { sku: product.sku, qty: 1, unitPriceNet: product.unitPriceNet },
            { sku: second.sku, qty: 1, unitPriceNet: second.unitPriceNet },
          ]
        : [{ sku: product.sku, qty: 1, unitPriceNet: product.unitPriceNet }];

    const { tipAmount, tipSuggestedAmount } = tipFromLines(lines);
    const paymentMethod = PAYMENTS[i % PAYMENTS.length]!;

    docs.push({
      daysAgo,
      index: i,
      waiterUserName: WAITERS[i % WAITERS.length]!,
      operatorUserName: OPERATORS[i % OPERATORS.length]!,
      posName: i % 2 === 0 ? 'Caja 1' : 'Caja 2',
      paymentMethod,
      leaveUnattributed: i % TIP_UNATTRIBUTED_EVERY === 0,
      tableCode: TABLE_CODES[i % TABLE_CODES.length]!,
      lines,
      tipAmount,
      tipSuggestedAmount,
    });
  }
  return docs;
}

export function countTipPlanCardOverdue(plan: SeedTipSaleDoc[]): number {
  return plan.filter(
    (d) =>
      (d.paymentMethod === 'DEBIT_CARD' || d.paymentMethod === 'CREDIT_CARD') &&
      d.daysAgo >= TIP_OVERDUE_MIN_DAYS_AGO,
  ).length;
}

export function countTipPlanUnattributed(plan: SeedTipSaleDoc[]): number {
  return plan.filter((d) => d.leaveUnattributed).length;
}
