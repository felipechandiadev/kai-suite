import { PaymentStatus } from '@modules/transactions/domain/transaction.entity';

const CLP_TOLERANCE = 1;

/** Venta cubierta al cobrar (incluye vuelto: lo recibido puede ser mayor que el total). */
export function isSaleFullyPaidByReceivedAmount(
  total: number,
  paidReceived: number,
): boolean {
  return (
    Math.round(Number(paidReceived) || 0) >=
    Math.round(Number(total) || 0) - CLP_TOLERANCE
  );
}

export function resolveSalePaymentStatusFromReceived(params: {
  deferPayment: boolean;
  hasPayments: boolean;
  total: number;
  paidReceived: number;
}): PaymentStatus | undefined {
  if (params.deferPayment) return PaymentStatus.PENDING;
  if (!params.hasPayments) return undefined;
  const paid = Math.round(Number(params.paidReceived) || 0);
  if (isSaleFullyPaidByReceivedAmount(params.total, paid)) {
    return PaymentStatus.PAID;
  }
  if (paid > CLP_TOLERANCE) return PaymentStatus.PARTIAL;
  return PaymentStatus.PENDING;
}

/** Monto `amountPaid` persistido en la transacción SALE. */
export function saleAmountPaidField(params: {
  deferPayment: boolean;
  total: number;
  paidReceived: number;
}): number {
  if (params.deferPayment) return 0;
  const totalR = Math.round(Number(params.total) || 0);
  const paidR = Math.round(Number(params.paidReceived) || 0);
  if (isSaleFullyPaidByReceivedAmount(params.total, params.paidReceived)) {
    return totalR;
  }
  return paidR;
}
