export type LaundryServiceLineTotalInput = {
  lineTotal: number | string;
};

export type LaundryTotalsResult = {
  servicesTotal: number;
  balanceDue: number;
};

/**
 * Suma lineTotal de todas las líneas de servicio y calcula saldo pendiente.
 */
export function recalculateLaundryTotals(
  lines: LaundryServiceLineTotalInput[],
  paidAmount: number | string = 0,
): LaundryTotalsResult {
  const servicesTotal = lines.reduce(
    (sum, line) => sum + (Number(line.lineTotal) || 0),
    0,
  );
  const paid = Number(paidAmount) || 0;
  const balanceDue = Math.max(0, servicesTotal - paid);
  return { servicesTotal, balanceDue };
}

export function computeServiceLineTotal(
  quantity: number | string,
  unitPrice: number | string,
): number {
  return (Number(quantity) || 0) * (Number(unitPrice) || 0);
}
