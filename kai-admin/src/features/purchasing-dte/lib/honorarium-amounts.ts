/**
 * Retención de honorarios como porcentaje del bruto (total): líquido = total × (1 − r/100).
 * Cálculo bidireccional coherente con montos enteros CLP.
 */
export function amountsHonorariumWhenTotalEdited(totalGross: number, retentionPercent: number) {
  const r = Math.min(99.99, Math.max(0, Number(retentionPercent) || 0));
  const total = Math.max(0, Math.round(totalGross));
  const factor = 1 - r / 100;
  const net = Math.round(total * factor);
  return { net, total, taxAmount: total - net };
}

export function amountsHonorariumWhenNetEdited(netInput: number, retentionPercent: number) {
  const r = Math.min(99.99, Math.max(0, Number(retentionPercent) || 0));
  const net = Math.max(0, Math.round(netInput));
  const factor = 1 - r / 100;
  if (factor <= 0.0001) {
    return { net, total: net, taxAmount: 0 };
  }
  const total = Math.round(net / factor);
  return { net, total, taxAmount: total - net };
}
