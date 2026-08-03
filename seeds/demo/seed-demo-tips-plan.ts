/**
 * Plan determinístico de ventas Kai Food (salón + propina en la misma SALE).
 * SKUs PHYSICAL food; qty acotada al stock recepcionado si se pasa purchasedQtyBySku.
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
const TABLE_CODES = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'] as const;

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
 * 30 ventas salón repartidas en ~45 días.
 * Si `purchasedQtyBySku` está presente, no vende más de lo recepcionado.
 */
export function buildSeedDemoTipsPlan(
  purchasedQtyBySku?: Map<string, number>,
): SeedTipSaleDoc[] {
  const remaining = new Map<string, number>();
  if (purchasedQtyBySku) {
    for (const [sku, qty] of purchasedQtyBySku) {
      remaining.set(sku, qty);
    }
  }

  const canTake = (sku: string, qty: number): boolean => {
    if (!purchasedQtyBySku) return true;
    return (remaining.get(sku) ?? 0) >= qty;
  };
  const consume = (sku: string, qty: number) => {
    if (!purchasedQtyBySku) return;
    remaining.set(sku, (remaining.get(sku) ?? 0) - qty);
  };

  const docs: SeedTipSaleDoc[] = [];
  let i = 0;
  let guard = 0;
  while (docs.length < TIP_SALE_TARGET && guard < TIP_SALE_TARGET * 8) {
    guard += 1;
    const daysAgo = Math.max(
      1,
      Math.min(
        TIP_SALE_HORIZON_DAYS,
        1 +
          Math.floor(
            (docs.length * (TIP_SALE_HORIZON_DAYS - 1)) /
              Math.max(1, TIP_SALE_TARGET - 1),
          ),
      ),
    );

    const product = FOOD_PHYSICAL_SKUS[i % FOOD_PHYSICAL_SKUS.length]!;
    const second =
      FOOD_PHYSICAL_SKUS[(i + 3) % FOOD_PHYSICAL_SKUS.length]!;
    i += 1;

    let lines: Array<{ sku: string; qty: number; unitPriceNet: number }>;
    if (docs.length % 3 === 0) {
      if (!canTake(product.sku, 1) || !canTake(second.sku, 1)) {
        if (!canTake(product.sku, 1)) continue;
        lines = [
          { sku: product.sku, qty: 1, unitPriceNet: product.unitPriceNet },
        ];
      } else {
        lines = [
          { sku: product.sku, qty: 1, unitPriceNet: product.unitPriceNet },
          { sku: second.sku, qty: 1, unitPriceNet: second.unitPriceNet },
        ];
      }
    } else {
      if (!canTake(product.sku, 1)) continue;
      lines = [
        { sku: product.sku, qty: 1, unitPriceNet: product.unitPriceNet },
      ];
    }

    for (const line of lines) {
      consume(line.sku, line.qty);
    }

    const { tipAmount, tipSuggestedAmount } = tipFromLines(lines);
    const paymentMethod = PAYMENTS[docs.length % PAYMENTS.length]!;
    const idx = docs.length;

    docs.push({
      daysAgo,
      index: idx,
      waiterUserName: WAITERS[idx % WAITERS.length]!,
      operatorUserName: OPERATORS[idx % OPERATORS.length]!,
      posName: idx % 2 === 0 ? 'Caja 1' : 'Caja 2',
      paymentMethod,
      leaveUnattributed: idx % TIP_UNATTRIBUTED_EVERY === 0,
      tableCode: TABLE_CODES[idx % TABLE_CODES.length]!,
      lines,
      tipAmount,
      tipSuggestedAmount,
    });
  }

  if (docs.length < TIP_SALE_TARGET) {
    console.warn(
      `⚠️ Plan ventas Food: solo ${docs.length}/${TIP_SALE_TARGET} docs (stock recepcionado insuficiente)`,
    );
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
